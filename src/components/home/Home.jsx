import { useState, useEffect, useCallback } from "react"
import { Clock, TruckIcon, ChevronLeft, ChevronRight, Search, Building, Calendar, Filter } from "lucide-react"
import axios from "axios"
import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subDays,
    isWithinInterval,
    isValid,
} from "date-fns"
import "./Home.css"

export default function Home() {
    const [rakeDetails, setRakeDetails] = useState([]) // All data
    const [plants, setPlants] = useState([]) // Store the list of plants
    const [selectedPlant, setSelectedPlant] = useState("All") // Default selection
    const [loading, setLoading] = useState(true) // Loading state
    const [error, setError] = useState(null) // Error state
    const [searchQuery, setSearchQuery] = useState("") // State for search query
    const [sortOption, setSortOption] = useState("today") // Default sort option
    const [customStartDate, setCustomStartDate] = useState("")
    const [customEndDate, setCustomEndDate] = useState("")
    const [lastFetchTime, setLastFetchTime] = useState(null)
    const [currentRakeIndex, setCurrentRakeIndex] = useState(0) // Track current rake in carousel
    const [appliedFilters, setAppliedFilters] = useState({
        plant: "All",
        filter: "today",
    }) // Track currently applied filters

    // Constants
    const POLL_INTERVAL = 30000 // 30 seconds
    const API_URL = "https://server-api-pearl.vercel.app"
    const MAX_RETRIES = 3
    const RETRY_DELAY = 2000 // 2 seconds

    // Get token from localStorage
    const getToken = useCallback(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("token")
        }
        return null
    }, [])

    // Config with authorization header
    const getAuthConfig = useCallback(() => {
        return {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
            },
            timeout: 10000, // 10 second timeout
        }
    }, [getToken])

    // Validate rake data
    const validateRakeData = useCallback((rake) => {
        return rake && typeof rake === "object" && rake.adminName && rake.rakeNo
    }, [])

    // Function to safely parse date
    const parseSafeDate = useCallback((dateStr, timeStr) => {
        try {
            const time24hr = convertTo24HourFormat(timeStr)
            const combinedDateTime = `${dateStr} ${time24hr}`
            const dateTime = new Date(combinedDateTime)
            return isValid(dateTime) ? dateTime : new Date()
        } catch (error) {
            console.error("Error parsing date:", error)
            return new Date()
        }
    }, [])

    // Enhanced time conversion with validation
    const convertTo24HourFormat = useCallback((time) => {
        if (!time || typeof time !== "string") {
            return "00:00"
        }

        try {
            const [hourMin, period] = time.trim().split(" ")
            if (!hourMin || !period) return "00:00"

            const [hour, minute] = hourMin.split(":").map((num) => {
                const parsed = Number.parseInt(num, 10)
                return isNaN(parsed) ? 0 : parsed
            })

            const validHour = Math.min(Math.max(hour, 0), 23)
            const validMinute = Math.min(Math.max(minute, 0), 59)
            const adjustedHour = period.toLowerCase() === "pm" && validHour !== 12 ? validHour + 12 : validHour

            return `${adjustedHour.toString().padStart(2, "0")}:${validMinute.toString().padStart(2, "0")}`
        } catch (error) {
            console.error("Error converting time format:", error)
            return "00:00"
        }
    }, [])

    // Helper function to normalize strings for comparison
    const normalizeString = useCallback((str) => {
        return str ? str.trim().toLowerCase() : ""
    }, [])

    // Fetch plants from the API with improved error handling
    const fetchPlants = useCallback(async () => {
        try {
            // Get all plants managed by the admin
            const response = await axios.get(`${API_URL}/api/admin/plants`, getAuthConfig())
            console.log("Plants API Response:", response.data) // Log the response for debugging

            // Add more robust error handling and response structure verification
            if (response.data) {
                // Check various possible response structures
                let plantData = []

                if (Array.isArray(response.data)) {
                    // If response.data is directly an array
                    plantData = response.data
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    // If response.data has a data property that's an array
                    plantData = response.data.data
                } else if (response.data.plants && Array.isArray(response.data.plants)) {
                    // Try another possible structure
                    plantData = response.data.plants
                } else if (response.data.result && Array.isArray(response.data.result)) {
                    // One more possible structure
                    plantData = response.data.result
                } else {
                    console.warn("Unexpected response structure:", response.data)
                    // If we can't find an array, use an empty array
                    plantData = []
                }

                // Extract unique plant names, with better error handling
                const plantNames = plantData
                    .filter((plant) => plant && typeof plant === "object")
                    .map((plant) => {
                        // Add additional logging to debug plant data
                        console.log("Plant data:", plant)
                        // Look for name in different possible locations
                        return plant.name || plant.plantName || plant.plant || ""
                    })
                    .filter(Boolean) // Remove empty strings
                    .filter(
                        (name, index, self) =>
                            // Remove duplicates (case-insensitive)
                            index === self.findIndex((n) => normalizeString(n) === normalizeString(name)),
                    )

                console.log("Extracted plant names:", plantNames)
                setPlants(plantNames)

                if (plantNames.length === 0) {
                    console.warn("No valid plant names found in response")
                }
            } else {
                throw new Error("No data received from server")
            }
        } catch (error) {
            console.error("Error fetching plants:", error)
            setError("Failed to fetch plants: " + (error.message || "Unknown error"))

            // Set empty plants array to prevent UI issues
            setPlants([])
        }
    }, [getAuthConfig, normalizeString])

    // Enhanced fetch function with retries and plant filtering - with improved error handling
    const fetchRakeDetails = useCallback(
        async (retryCount = 0) => {
            try {
                // Prevent too frequent requests
                const now = Date.now()
                if (lastFetchTime && now - lastFetchTime < 5000) {
                    // 5 second minimum interval
                    return
                }

                // Get all plants and their rake details
                const response = await axios.get(`${API_URL}/api/admin/plants`, getAuthConfig())
                console.log("Rake Details API Response:", response.data) // Log the response for debugging

                setLastFetchTime(now)
                setError(null)

                if (!response.data) {
                    throw new Error("No data received from server")
                }

                // Process different possible response structures
                let plantsData = []
                if (Array.isArray(response.data)) {
                    plantsData = response.data
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    plantsData = response.data.data
                } else if (response.data.plants && Array.isArray(response.data.plants)) {
                    plantsData = response.data.plants
                } else if (response.data.result && Array.isArray(response.data.result)) {
                    plantsData = response.data.result
                } else {
                    console.warn("Unexpected response structure:", response.data)
                    plantsData = []
                }

                // Create a debug object to track what's happening
                const debug = {
                    totalPlantsReceived: plantsData.length,
                    plantsProcessed: 0,
                    plantNames: [],
                    appliedPlantFilter: appliedFilters.plant,
                    normalizedPlantFilter: normalizeString(appliedFilters.plant),
                    plantsMatchingSelection: 0,
                    totalRakesFound: 0,
                    plantsWithNoData: [],
                }

                let allRakeDetails = []

                // Process each plant - using the applied filter instead of selectedPlant
                plantsData.forEach((plant) => {
                    // Ensure plant is a valid object
                    if (!plant || typeof plant !== "object") {
                        console.log("Invalid plant object:", plant)
                        return
                    }

                    debug.plantsProcessed++

                    // Get plant name from different possible properties
                    const plantName = plant.name || plant.plantName || plant.plant || ""
                    debug.plantNames.push(plantName)

                    const normalizedPlantName = normalizeString(plantName)
                    console.log(
                        `Processing plant: "${plantName}", Normalized: "${normalizedPlantName}", Applied plant filter: "${appliedFilters.plant}", Normalized Filter: "${debug.normalizedPlantFilter}"`,
                    )

                    // Skip if a specific plant is selected and this isn't it
                    // More flexible comparison - case insensitive and trim
                    const shouldProcessPlant =
                        appliedFilters.plant === "All" || normalizedPlantName === debug.normalizedPlantFilter

                    if (!shouldProcessPlant) {
                        console.log(
                            `Skipping plant "${plantName}" because it doesn't match applied plant filter "${appliedFilters.plant}"`,
                        )
                        return
                    }

                    debug.plantsMatchingSelection++
                    console.log(`Found matching plant: ${plantName}`)

                    // Process rake details for this plant
                    if (plant.rakeDetails && Array.isArray(plant.rakeDetails)) {
                        console.log(`Plant ${plantName} has ${plant.rakeDetails.length} rake details`)

                        if (plant.rakeDetails.length === 0) {
                            debug.plantsWithNoData.push(plantName)
                        }

                        const plantRakeDetails = plant.rakeDetails
                            .filter(validateRakeData)
                            .map((item) => {
                                try {
                                    const dateTime = item.date && item.time ? parseSafeDate(item.date, item.time) : new Date()

                                    // Safely parse wagon shifting details
                                    const wagonShiftingDetails = item.wagonShifting
                                        ? Object.keys(item.wagonShifting)
                                            .map((key) => ({
                                                key,
                                                ...item.wagonShifting[key],
                                            }))
                                            .filter((detail) => detail && typeof detail === "object")
                                        : []

                                    return {
                                        ...item,
                                        plant: plantName, // Add plant name
                                        plantId: plant._id || "", // Store plant ID if needed
                                        dateTime,
                                        isCheckedOut: Boolean(item.checkoutTime),
                                        wagonShiftingDetails,
                                        wagons: Number.parseInt(item.wagons, 10) || 0,
                                    }
                                } catch (error) {
                                    console.error("Error processing rake item:", error)
                                    return null
                                }
                            })
                            .filter(Boolean) // Remove any null items from processing errors

                        debug.totalRakesFound += plantRakeDetails.length
                        console.log(`Added ${plantRakeDetails.length} valid rake details from plant ${plantName}`)
                        allRakeDetails = [...allRakeDetails, ...plantRakeDetails]
                    } else {
                        console.log(`Plant ${plantName} has no rake details array`)
                        debug.plantsWithNoData.push(plantName)
                    }
                })

                console.log("Filtering debug info:", debug)

                // Sort all rake details by dateTime (most recent first)
                allRakeDetails.sort((a, b) => b.dateTime - a.dateTime)
                setRakeDetails(allRakeDetails)

                console.log(`Total rake details after processing: ${allRakeDetails.length}`)
            } catch (error) {
                console.error("Error fetching rake details:", error)
                setError(error.message || "Unknown error occurred")

                // Implement retry logic
                if (retryCount < MAX_RETRIES) {
                    setTimeout(
                        () => {
                            fetchRakeDetails(retryCount + 1)
                        },
                        RETRY_DELAY * (retryCount + 1),
                    )
                }
            } finally {
                setLoading(false)
            }
        },
        [lastFetchTime, getAuthConfig, normalizeString, appliedFilters.plant, validateRakeData, parseSafeDate],
    )

    // Initial fetch for plants and rake details
    useEffect(() => {
        fetchPlants()
        fetchRakeDetails()
    }, [fetchPlants, fetchRakeDetails])

    // Refetch rake details when applied filters change
    useEffect(() => {
        console.log("Applied filters changed to:", appliedFilters)
        fetchRakeDetails()
    }, [appliedFilters, fetchRakeDetails])

    // Polling setup with error handling
    useEffect(() => {
        let pollInterval

        if (!error) {
            pollInterval = setInterval(() => {
                fetchRakeDetails()
            }, POLL_INTERVAL)
        }

        return () => {
            if (pollInterval) {
                clearInterval(pollInterval)
            }
        }
    }, [fetchRakeDetails, error])

    // Safe filter function - using applied filters instead of selectedPlant and sortOption
    const safeFilter = useCallback(
        (rake) => {
            try {
                // First, filter by "Not Checked Out" status
                if (rake.isCheckedOut) {
                    return false // Skip checked out rows
                }

                // Then, filter by search query
                if (searchQuery) {
                    const lowercasedQuery = searchQuery.toLowerCase()
                    const matchesSearch =
                        (rake.rakeNo?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
                            rake.adminName?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
                            rake.source?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
                            rake.plant?.toString()?.toLowerCase()?.includes(lowercasedQuery)) ??
                        false

                    if (!matchesSearch) return false
                }

                // Then apply date filters
                if (appliedFilters.filter === "allData") {
                    // For "allData", return everything that made it past the search query filter
                    return true
                }

                const today = new Date()

                if (!isValid(rake.dateTime)) {
                    console.log("Invalid date for rake:", rake)
                    return false
                }

                switch (appliedFilters.filter) {
                    case "today":
                        return isWithinInterval(rake.dateTime, {
                            start: startOfDay(today),
                            end: endOfDay(today),
                        })
                    case "yesterday": {
                        const yesterday = subDays(today, 1)
                        return isWithinInterval(rake.dateTime, {
                            start: startOfDay(yesterday),
                            end: endOfDay(yesterday),
                        })
                    }
                    case "thisWeek":
                        return isWithinInterval(rake.dateTime, {
                            start: startOfWeek(today),
                            end: endOfWeek(today),
                        })
                    case "thisMonth":
                        return isWithinInterval(rake.dateTime, {
                            start: startOfMonth(today),
                            end: endOfMonth(today),
                        })
                    case "custom":
                        if (customStartDate && customEndDate) {
                            const start = startOfDay(new Date(customStartDate))
                            const end = endOfDay(new Date(customEndDate))
                            return isValid(start) && isValid(end) && isWithinInterval(rake.dateTime, { start, end })
                        }
                        return true
                    default:
                        return true
                }
            } catch (error) {
                console.error("Error filtering rake:", error)
                return false
            }
        },
        [searchQuery, customStartDate, customEndDate, appliedFilters.filter],
    )

    const filteredRakeDetails = rakeDetails.filter(safeFilter)

    // Apply filters function - to be called when the filter button is clicked
    const applyFilters = () => {
        setAppliedFilters({
            plant: selectedPlant,
            filter: sortOption,
        })
        console.log("Applying filters:", { plant: selectedPlant, filter: sortOption })
    }

    // Handle next/previous in carousel
    const handleNext = () => {
        if (filteredRakeDetails.length > 0) {
            setCurrentRakeIndex((prevIndex) => (prevIndex + 1) % filteredRakeDetails.length)
        }
    }

    const handlePrevious = () => {
        if (filteredRakeDetails.length > 0) {
            setCurrentRakeIndex((prevIndex) => (prevIndex === 0 ? filteredRakeDetails.length - 1 : prevIndex - 1))
        }
    }

    // Calculate time left
    const calculateTimeLeft = (dateTime, duration) => {
        if (!dateTime || isNaN(duration)) {
            return { timeLeft: "-", timeLeftMs: 0 }
        }

        try {
            const endTime = new Date(dateTime.getTime() + duration * 60 * 60 * 1000) // Duration in hours
            const timeLeft = endTime - new Date()

            if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / (1000 * 60 * 60))
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
                return { timeLeft: `${hours}h ${minutes}m left`, timeLeftMs: timeLeft }
            } else if (timeLeft < 0) {
                const hours = Math.abs(Math.floor(timeLeft / (1000 * 60 * 60)))
                const minutes = Math.abs(Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)))
                return {
                    timeLeft: `+ ${hours}h ${minutes}m exceed`,
                    timeLeftMs: timeLeft,
                }
            }
            return { timeLeft: "Expired", timeLeftMs: 0 }
        } catch (error) {
            console.error("Error calculating time left:", error)
            return { timeLeft: "Error", timeLeftMs: 0 }
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Loading dashboard data...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="error-container">
                <h3>Error fetching data</h3>
                <p>Details: {error || "Unknown error"}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        )
    }

    // Determine if we should show carousel controls
    const showCarousel = filteredRakeDetails.length > 1

    // Get current rake for display
    const currentRake = filteredRakeDetails[currentRakeIndex] || {}

    return (
        <div className="dashboard-container">
            <div className="filter-controls">
                <div className="search-container">
                    <div className="input-with-icon">
                        <Search className="input-icon" size={18} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Plant Filter Dropdown */}
                <div className="plant-filter-container">
                    <div className="input-with-icon">
                        <Building className="input-icon" size={18} />
                        <select value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)} className="plant-select">
                            <option value="All">All Plants</option>
                            {plants.map((plant, index) => (
                                <option key={index} value={plant}>
                                    {plant}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Date Filter Dropdown */}
                <div className="date-filter-container">
                    <div className="input-with-icon">
                        <Calendar className="input-icon" size={18} />
                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="sort-select">
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="thisWeek">This Week</option>
                            <option value="thisMonth">This Month</option>
                            <option value="custom">Custom</option>
                            <option value="allData">All Data</option>
                        </select>
                    </div>

                    {sortOption === "custom" && (
                        <div className="custom-date-inputs">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="custom-date-input"
                            />
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="custom-date-input"
                            />
                        </div>
                    )}
                </div>

                {/* Filter Button */}
                <button className="filter-btn" onClick={applyFilters} disabled={loading}>
                    <Filter size={16} />
                    Apply Filters
                </button>
            </div>

            {filteredRakeDetails.length === 0 ? (
                <div className="no-data-message">No 'Not Checked Out' records found for the selected filters</div>
            ) : (
                <>
                    <div className="dashboard-row">
                        {/* Rake Change Card with Carousel */}
                        <div className="dashboard-card rake-change-card">
                            <div className="rake-card-header">
                                <h2 className="card-title">Rake Change</h2>
                                {showCarousel && (
                                    <div className="carousel-counter">
                                        {currentRakeIndex + 1} / {filteredRakeDetails.length}
                                    </div>
                                )}
                            </div>

                            <div className="rake-card-content">
                                <div className="info-row">
                                    <div className="info-icon user-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <div className="info-label">Operator Name :</div>
                                    <div className="info-value">{currentRake.adminName || "N/A"}</div>
                                </div>

                                <div className="info-row">
                                    <div className="info-icon info-icon-circle">
                                        <div className="circle"></div>
                                    </div>
                                    <div className="info-label">Plant :</div>
                                    <div className="info-value">{currentRake.plant || "N/A"}</div>
                                </div>

                                <div className="info-row">
                                    <div className="info-icon info-icon-circle">
                                        <div className="circle"></div>
                                    </div>
                                    <div className="info-label">Rake No :</div>
                                    <div className="info-value">{currentRake.rakeNo || "N/A"}</div>
                                </div>

                                <div className="info-row">
                                    <div className="info-icon check-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <div className="info-label">Status :</div>
                                    <div className="info-value">{currentRake.isCheckedOut ? "Checked Out" : "Not Checked Out"}</div>
                                </div>

                                <div className="info-row">
                                    <div className="info-icon check-icon">
                                        <Clock size={20} />
                                    </div>
                                    <div className="info-label">Timing :</div>
                                    <div className="info-value">
                                        {currentRake.timeLeft?.timeLeft ||
                                            (currentRake.dateTime && currentRake.duration
                                                ? calculateTimeLeft(currentRake.dateTime, Number.parseFloat(currentRake.duration)).timeLeft
                                                : "-")}
                                    </div>
                                </div>
                            </div>

                            {/* Carousel Navigation Controls */}
                            {showCarousel && (
                                <div className="carousel-controls">
                                    <button className="carousel-button prev" onClick={handlePrevious} aria-label="Previous rake">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button className="carousel-button next" onClick={handleNext} aria-label="Next rake">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* IOT Card with Carousel */}
                        <div className="dashboard-card iot-card">
                            <div className="rake-card-header">
                                <h2 className="card-title">IOT</h2>
                                {showCarousel && (
                                    <div className="carousel-counter">
                                        {currentRakeIndex + 1} / {filteredRakeDetails.length}
                                    </div>
                                )}
                            </div>

                            <div className="rake-card-content">
                                <div className="info-row">
                                    <div className="info-icon info-icon-circle">
                                        <div className="circle"></div>
                                    </div>
                                    <div className="info-label">Rake No :</div>
                                    <div className="info-value">{currentRake.rakeNo || "N/A"}</div>
                                </div>

                                <div className="info-row">
                                    <div className="info-icon tag-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M7 7H7.01M7 3H12C12.5119 2.9979 13.0237 3.19358 13.4142 3.58421L20.4142 10.5842C21.1953 11.3653 21.1953 12.6342 20.4142 13.4153L13.4142 20.4153C12.6332 21.1963 11.3642 21.1963 10.5832 20.4153L3.58324 13.4153C3.19262 13.0247 2.99694 12.5129 2.99902 12.001V7C2.99902 5.89543 3.89445 4.99999 4.99902 4.99999L7 3ZM7 7C7 7.55228 6.55228 8 6 8C5.44772 8 5 7.55228 5 7C5 6.44772 5.44772 6 6 6C6.55228 6 7 6.44772 7 7Z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <div className="info-label">Total Bulging :</div>
                                    <div className="info-value">{currentRake.totalBulging || "N/A"}</div>
                                </div>

                                <div className="info-row">
                                    <div className="info-icon right-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M5 12H19M19 12L12 5M19 12L12 19"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <div className="info-label">Left :</div>
                                    <div className="info-value">{currentRake.left || "N/A"}</div>
                                </div>

                                <div className="info-row">
                                    <div className="info-icon left-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M19 12H5M5 12L12 5M5 12L12 19"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <div className="info-label">Right :</div>
                                    <div className="info-value">{currentRake.right || "N/A"}</div>
                                </div>
                            </div>

                            {/* Carousel Navigation Controls */}
                            {showCarousel && (
                                <div className="carousel-controls">
                                    <button className="carousel-button prev" onClick={handlePrevious} aria-label="Previous rake">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button className="carousel-button next" onClick={handleNext} aria-label="Next rake">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Wagons Card with Carousel */}
                    <div className="dashboard-card wagons-card">
                        <div className="wagons-header">
                            <div className="wagons-title">
                                <TruckIcon size={24} />
                                <h2 className="card-title">Wagons</h2>
                            </div>

                            <div className="wagons-rake-info-container">
                                <div className="wagons-rake-info">
                                    <div className="info-icon info-icon-circle">
                                        <div className="circle"></div>
                                    </div>
                                    <div className="info-label">Rake No :</div>
                                    <div className="info-value">{currentRake.rakeNo || "N/A"}</div>
                                </div>

                                {showCarousel && (
                                    <div className="carousel-counter">
                                        {currentRakeIndex + 1} / {filteredRakeDetails.length}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="wagons-grid">
                            {(currentRake.wagonShiftingDetails?.length > 0 ? currentRake.wagonShiftingDetails : Array(8).fill()).map(
                                (wagon, index) => (
                                    <div key={index} className="wagon-item">
                                        <div className="wagon-header">
                                            <TruckIcon size={24} />
                                            <div className="wagon-title">WT No : {wagon?.number || index + 1}</div>
                                        </div>
                                        <div className="wagon-info">
                                            Number of Wagons :{" "}
                                            {wagon?.count || (currentRake.wagons ? Math.ceil(currentRake.wagons / 8) : "N/A")}
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>

                        {/* Carousel Navigation Controls */}
                        {showCarousel && (
                            <div className="carousel-controls">
                                <button className="carousel-button prev" onClick={handlePrevious} aria-label="Previous rake">
                                    <ChevronLeft size={20} />
                                </button>
                                <button className="carousel-button next" onClick={handleNext} aria-label="Next rake">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

