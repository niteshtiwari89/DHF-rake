import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import "./Dashboard.css"
import * as XLSX from "xlsx"
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
import { Filter, Download, Search, Calendar, Building, History } from "lucide-react"

import ReactExport from 'react-data-export';

const ExcelFile = ReactExport.ExcelFile;  // Use directly from ReactExport
const ExcelSheet = ReactExport.ExcelSheet; 
 

const Dashboard = () => {
    const navigate = useNavigate()
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
    const [debugInfo, setDebugInfo] = useState({}) // For debugging
    const [appliedFilters, setAppliedFilters] = useState({
        plant: "All",
        filter: "today",
    }) // Track currently applied filters

    // Constants
    const POLL_INTERVAL = 10000 // 10 seconds
    const API_URL = "https://server-api-pearl.vercel.app"
    const MAX_RETRIES = 3
    const RETRY_DELAY = 2000 // 2 seconds

    // Get token from localStorage
    const getToken = () => {
        return localStorage.getItem("token")
    }
    console.log("ReactExport", ReactExport); 
    console.log("Excel File",ExcelFile);
    console.log("Excel Sheet",ExcelSheet);

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
    })

    // Validate rake data
    const validateRakeData = (rake) => {
        return (
            rake && typeof rake === "object" && rake.adminName && rake.rakeNo && rake.date && rake.time && !isNaN(rake.wagons)
        )
    }

    // Function to safely parse date
    const parseSafeDate = (dateStr, timeStr) => {
        try {
            const time24hr = convertTo24HourFormat(timeStr)
            const combinedDateTime = `${dateStr} ${time24hr}`
            const dateTime = new Date(combinedDateTime)
            return isValid(dateTime) ? dateTime : new Date()
        } catch (error) {
            console.error("Error parsing date:", error)
            return new Date()
        }
    }

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
    const normalizeString = (str) => {
        return str ? str.trim().toLowerCase() : ""
    }

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
                                    const dateTime = parseSafeDate(item.date, item.time)

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

                // Set debug info for troubleshooting
                setDebugInfo(debug)
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
        [lastFetchTime, getAuthConfig, normalizeString, appliedFilters.plant],
    )

    // Initial fetch for plants and rake details
    useEffect(() => {
        // Check if user is authenticated
        if (!getToken()) {
            navigate("/")
            return
        }

        fetchPlants()
        fetchRakeDetails()
    }, [fetchPlants, fetchRakeDetails, navigate])

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

    // Safe download function
    // const downloadReport = useCallback(() => {
    //     try {
    //         const workbook = XLSX.utils.book_new()
    //         const exportData = filteredRakeDetails.map((rake) => ({
    //             Plant: rake.plant || "N/A",
    //             "Operator Name": rake.adminName || "N/A",
    //             "Rake No": rake.rakeNo || "N/A",
    //             Source: rake.source || "N/A",
    //             "Arrival Date": rake.date || "N/A",
    //             "No of Wagons": rake.wagons || 0,
    //             "Check In Time": rake.time || "-",
    //             "Check Out Time": rake.checkoutTime || "-",
    //             Status: rake.isCheckedOut ? "Checked Out" : "Not Checked Out",
    //             Timing: rake.timing || "-",
    //         }))

    //         const worksheet = XLSX.utils.json_to_sheet(exportData)
    //         XLSX.utils.book_append_sheet(workbook, worksheet, "Rake Data")
    //         XLSX.writeFile(workbook, `rake_report_${new Date().toISOString().split("T")[0]}.xlsx`)
    //     } catch (error) {
    //         console.error("Error downloading report:", error)
    //         alert("Failed to download report. Please try again.")
    //     }
    // }, [filteredRakeDetails])

    const downloadReport = useCallback(() => {
        try {
          // Prepare data for export
          const exportData = filteredRakeDetails.map(rake => ({
            Plant: rake.plant || "N/A",
            "Operator Name": rake.adminName || "N/A",
            "Rake No": rake.rakeNo || "N/A",
            Source: rake.source || "N/A",
            "Arrival Date": rake.date || "N/A",
            "No of Wagons": rake.wagons || 0,
            "Check In Time": rake.time || "-",
            "Check Out Time": rake.checkoutTime || "-",
            Status: rake.isCheckedOut ? "Checked Out" : "Not Checked Out",
            Timing: rake.timing || "-"
          }));
      
          // Use ReactExport's ExcelFile directly, if ExcelSheet is unavailable
          const element = (
            <ReactExport.ExcelFile
              element={<button>Download Rake Report</button>}
            >
              <ReactExport.ExcelSheet data={exportData} name="Rake Data">
                {/* Define your columns and data here */}
              </ReactExport.ExcelSheet>
            </ReactExport.ExcelFile>
          );
      
          // Trigger the download
          element.props.element.click(); // Programmatically trigger the download
        } catch (error) {
          console.error("Error downloading report:", error);
          alert("Failed to download report. Please try again.");
        }
      }, [filteredRakeDetails]);
    // Apply filters function - to be called when the filter button is clicked
    const applyFilters = () => {
        setAppliedFilters({
            plant: selectedPlant,
            filter: sortOption,
        })
        console.log("Applying filters:", { plant: selectedPlant, filter: sortOption })
    }



    // timing 



    return (
        <div className="home-container">
            <div className="dashboard-header">
                <h2>Rake Entry Dashboard (Not Checked Out)</h2>
                {error && <div className="error-message">Error: {error}. Retrying...</div>}

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

                    {/* History Button */}
                    <button className="history-btn" onClick={() => navigate("/history")}>
                        <History size={16} />
                        History
                    </button>

                    {/* Download Report Button */}
                    <button className="down-report-btn" onClick={downloadReport} disabled={loading || error}>
                        <Download size={16} />
                        Download Report
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="rake-table">
                    <thead>
                        <tr>
                            <th>Plant</th>
                            <th>Operator Name</th>
                            <th>Rake No</th>
                            <th>Source</th>
                            <th>Arrival Date</th>
                            <th>No of Wagons</th>
                            <th>Check In Time</th>
                            <th>Check Out Time</th>
                            <th>Status</th>
                            <th>Timing</th>
                        </tr>
                    </thead>
                    {loading ? (
                        <tbody>
                            <tr>
                                <td colSpan="10" className="loading-message">
                                    Loading...
                                </td>
                            </tr>
                        </tbody>
                    ) : filteredRakeDetails.length === 0 ? (
                        <tbody>
                            <tr>
                                <td colSpan="10" className="no-data-message">
                                    {error ? "Error loading data" : "No 'Not Checked Out' records found for the selected filters"}
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody>
                            {filteredRakeDetails.map((rake) => (
                                <tr key={rake._id || Math.random().toString()}>
                                    <td>{rake.plant || "N/A"}</td>
                                    <td>{rake.adminName || "N/A"}</td>
                                    <td>{rake.rakeNo || "N/A"}</td>
                                    <td>{rake.source || "N/A"}</td>
                                    <td>{rake.date || "N/A"}</td>
                                    <td>{rake.wagons || 0}</td>
                                    <td>{rake.time || "-"}</td>
                                    <td>{rake.checkoutTime || "-"}</td>
                                    <td>
                                        <span className="status-badge not-checked-out">
                                            Not Checked Out
                                        </span>
                                    </td>
                                    <td>
                                        {rake.timeLeft?.timeLeft ||
                                            calculateTimeLeft(
                                                rake.dateTime,
                                                parseFloat(rake.duration)
                                            ).timeLeft || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>
        </div>
    )
}

const calculateTimeLeft = (dateTime, duration) => {
    const endTime = new Date(dateTime.getTime() + duration * 60 * 60 * 1000); // Duration in hours
    const timeLeft = endTime - new Date();

    if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        return { timeLeft: `${hours}h ${minutes}m left`, timeLeftMs: timeLeft };
    } else if (timeLeft < 0) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        return {
            timeLeft: `+ ${-hours}h ${-minutes}m exceed`,
            timeLeftMs: timeLeft,
        };
    }
    return { timeLeft: "Expired", timeLeftMs: 0 };
};
export default Dashboard