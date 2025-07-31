import React from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import "./Rakechange.css"
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
import { Filter, Download, Search, Calendar, Building } from "lucide-react"

const Rakechange = () => {
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
  const getToken = useCallback(() => {
    return localStorage.getItem("token")
  }, [])

  // Config with authorization header
  const getAuthConfig = useCallback(() => {
    const token = getToken()
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      timeout: 10000, // 10 second timeout
    }
  }, [getToken])

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

  // Function to safely parse date
  const parseSafeDate = useCallback(
    (dateStr, timeStr) => {
      try {
        const time24hr = convertTo24HourFormat(timeStr)
        const combinedDateTime = `${dateStr} ${time24hr}`
        const dateTime = new Date(combinedDateTime)
        return isValid(dateTime) ? dateTime : new Date()
      } catch (error) {
        console.error("Error parsing date:", error)
        return new Date()
      }
    },
    [convertTo24HourFormat],
  )

  // Helper function to normalize strings for comparison
  const normalizeString = (str) => {
    return str ? str.trim().toLowerCase() : ""
  }

  // Fetch plants from the API with improved error handling
  const fetchPlants = useCallback(async () => {
    try {
      // Get all plants managed by the admin
      const response = await axios.get(`${API_URL}/api/admin/plants`, getAuthConfig())
      console.log("Plants API Response:", response.data)

      if (response.data) {
        let plantData = []

        if (Array.isArray(response.data)) {
          plantData = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          plantData = response.data.data
        } else if (response.data.plants && Array.isArray(response.data.plants)) {
          plantData = response.data.plants
        } else if (response.data.result && Array.isArray(response.data.result)) {
          plantData = response.data.result
        } else {
          console.warn("Unexpected response structure:", response.data)
          plantData = []
        }

        const plantNames = plantData
          .filter((plant) => plant && typeof plant === "object")
          .map((plant) => {
            console.log("Plant data:", plant)
            return plant.name || plant.plantName || plant.plant || ""
          })
          .filter(Boolean)
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
      setPlants([])
    }
  }, [getAuthConfig]) // Removed normalizeString from dependencies

  // Enhanced fetch function with retries and plant filtering
  const fetchRakeDetails = useCallback(
    async (retryCount = 0) => {
      try {
        const now = Date.now()
        if (lastFetchTime && now - lastFetchTime < 5000) {
          return
        }

        const response = await axios.get(`${API_URL}/api/admin/plants`, getAuthConfig())
        console.log("Rake Details API Response:", response.data)

        setLastFetchTime(now)
        setError(null)

        if (!response.data) {
          throw new Error("No data received from server")
        }

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

        const debug = {
          totalPlantsReceived: plantsData.length,
          plantsProcessed: 0,
          plantNames: [],
          appliedPlantFilter: appliedFilters.plant,
          normalizedPlantFilter: normalizeString(appliedFilters.plant),
          plantsMatchingSelection: 0,
          totalRakeChangesFound: 0,
          plantsWithNoData: [],
        }

        let allRakeDetails = []

        plantsData.forEach((plant) => {
          if (!plant || typeof plant !== "object") {
            console.log("Invalid plant object:", plant)
            return
          }

          debug.plantsProcessed++

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

          if (plant.rakeDetails && Array.isArray(plant.rakeDetails)) {
            console.log(`Plant ${plantName} has ${plant.rakeDetails.length} rake details`)

            if (plant.rakeDetails.length === 0) {
              debug.plantsWithNoData.push(plantName)
            }

            const plantRakeDetails = plant.rakeDetails
              .filter((item) => item && typeof item === "object")
              .map((item) => {
                try {
                  const dateTime = parseSafeDate(item.date, item.time)

                  const wagonShiftingDetails = item.wagonShifting
                    ? Object.keys(item.wagonShifting).map((key) => ({
                      key,
                      rakeNo: item.rakeNo,
                      plant: plantName,
                      dateTime,
                      ...item.wagonShifting[key],
                    }))
                    : []

                  debug.totalRakeChangesFound += wagonShiftingDetails.length

                  return {
                    ...item,
                    plant: plantName,
                    plantId: plant._id || "",
                    dateTime,
                    wagonShiftingDetails,
                  }
                } catch (error) {
                  console.error("Error processing rake item:", error)
                  return null
                }
              })
              .filter(Boolean)

            console.log(`Added ${plantRakeDetails.length} valid rake details from plant ${plantName}`)
            allRakeDetails = [...allRakeDetails, ...plantRakeDetails]
          } else {
            console.log(`Plant ${plantName} has no rake details array`)
            debug.plantsWithNoData.push(plantName)
          }
        })

        setDebugInfo(debug)
        console.log("Filtering debug info:", debug)

        allRakeDetails.sort((a, b) => b.dateTime - a.dateTime)
        setRakeDetails(allRakeDetails)

        console.log(`Total rake details after processing: ${allRakeDetails.length}`)
      } catch (error) {
        console.error("Error fetching rake details:", error)
        setError(error.message || "Unknown error occurred")

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
    [lastFetchTime, appliedFilters.plant, getAuthConfig, parseSafeDate], // Removed normalizeString from dependencies
  )

  // Initial fetch for plants and rake details
  useEffect(() => {
    if (!getToken()) {
      navigate("/login")
      return
    }

    fetchPlants()
    fetchRakeDetails()
  }, [fetchPlants, fetchRakeDetails, navigate, getToken])

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

  // Safe filter function for rake details
  const safeFilterRakeDetails = useCallback(
    (rake) => {
      try {
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

        if (appliedFilters.filter === "allData") {
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
    [searchQuery, appliedFilters.filter, customStartDate, customEndDate],
  )

  // Filter rake details based on search and date criteria
  const filteredRakeDetails = rakeDetails.filter(safeFilterRakeDetails)

  // Safe download function

  // const downloadReport = useCallback(() => {
  //   try {
  //     const workbook = XLSX.utils.book_new()

  //     const exportData = filteredRakeDetails.flatMap((rake) =>
  //       rake.wagonShiftingDetails && rake.wagonShiftingDetails.length > 0
  //         ? rake.wagonShiftingDetails.map((tipler) => ({
  //           Plant: rake.plant || "N/A",
  //           "Rake Number": rake.rakeNo || "N/A",
  //           Operator: rake.adminName || "N/A",
  //           "Wagon Tipler": tipler.key || "N/A",
  //           "Start Time": tipler.startTime || "N/A",
  //           "No of Wagons": tipler.noOfWagon || "N/A",
  //         }))
  //         : [
  //           {
  //             Plant: rake.plant || "N/A",
  //             "Rake Number": rake.rakeNo || "N/A",
  //             Operator: rake.adminName || "N/A",
  //             "Wagon Tipler": "N/A",
  //             "Start Time": "N/A",
  //             "No of Wagons": "N/A",
  //           },
  //         ],
  //     )

  //     const worksheet = XLSX.utils.json_to_sheet(exportData)
  //     XLSX.utils.book_append_sheet(workbook, worksheet, "Rake Change Data")
  //     XLSX.writeFile(workbook, `rake_change_report_${new Date().toISOString().split("T")[0]}.xlsx`)
  //   } catch (error) {
  //     console.error("Error downloading report:", error)
  //     alert("Failed to download report. Please try again.")
  //   }
  // }, [filteredRakeDetails])


  const downloadReport = useCallback(() => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Prepare the data using your existing logic
      const exportData = filteredRakeDetails.flatMap((rake) =>
        rake.wagonShiftingDetails && rake.wagonShiftingDetails.length > 0
          ? rake.wagonShiftingDetails.map((tipler) => ([
            rake.plant || "N/A",
            rake.rakeNo || "N/A",
            rake.adminName || "N/A",
            tipler.key || "N/A",
            tipler.startTime || "N/A",
            tipler.noOfWagon || "N/A"
          ]))
          : [
            [
              rake.plant || "N/A",
              rake.rakeNo || "N/A",
              rake.adminName || "N/A",
              "N/A",
              "N/A",
              "N/A"
            ]
          ]
      );

      // Create worksheet with title row and header row
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["RAKE CHANGE REPORT"], // Title row
        [
          "Plant",
          "Rake Number",
          "Operator",
          "Wagon Tipler",
          "Start Time",
          "No of Wagons"
        ], // Header row
      ]);

      // Start adding data from row 3 (after title and header)
      XLSX.utils.sheet_add_aoa(worksheet, exportData, { origin: "A3" });

      // Merge cells for the title
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }); // Merge all 6 columns in row 0

      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 },  // Plant
        { wch: 15 },  // Rake Number
        { wch: 20 },  // Operator
        { wch: 15 },  // Wagon Tipler
        { wch: 20 },  // Start Time
        { wch: 15 },  // No of Wagons
      ];

      // Add cell styles
      for (let i = 0; i < 6; i++) {
        // Style title row (row 0)
        const titleCellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (!worksheet[titleCellRef]) worksheet[titleCellRef] = { v: worksheet[titleCellRef]?.v || "" };
        worksheet[titleCellRef].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: "center", vertical: "center" }
        };

        // Style header row (row 1)
        const headerCellRef = XLSX.utils.encode_cell({ r: 1, c: i });
        if (!worksheet[headerCellRef]) worksheet[headerCellRef] = { v: worksheet[headerCellRef]?.v || "" };
        worksheet[headerCellRef].s = {
          font: { bold: true },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rake Change Data");

      // For XLSX with styles, we need to use XLSX.write to get a binary string
      // and then create a blob to download
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary', cellStyles: true });

      // Convert binary string to ArrayBuffer
      function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      }

      // Create a blob and trigger download
      const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
      const fileName = `rake_change_report_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Create download link and trigger click
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

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

  return (
    <div className="wagon-shifting-container">
      <div className="dashboard-header">
        <h2>Wagon Shifting Dashboard</h2>
        {error && <div className="error-message">Error: {error}. Retrying...</div>}

        <div className="filter-controls">
          <div className="search-container">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder="Search Rake Number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Plant Filter Dropdown */}
          <div className="plant-filter-container">
            <div className="input-with-icon">
              <Building className="input-icon" size={18} />
              <select
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Plants</option>
                {plants.map((plant, index) => (
                  <option key={index} value={plant}>
                    {plant}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="date-filter-container">
            <div className="input-with-icon">
              <Calendar className="input-icon" size={18} />
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="filter-select">
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

          <button className="filter-btn" onClick={applyFilters} disabled={loading}>
            <Filter size={16} />
            Apply Filters
          </button>

          <button className="download-btn" onClick={downloadReport} disabled={loading || error}>
            <Download size={16} />
            Download Report
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="wagon-shifting-table">
          <thead>
            <tr>
              <th>Plant</th>
              <th>Rake Number</th>
              <th>Operator</th>
              <th>Wagon Tipler</th>
              <th>Start Time</th>
              <th>No of Wagons</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="loading-message">
                  Loading...
                </td>
              </tr>
            ) : filteredRakeDetails.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data-message">
                  {error ? "Error loading data" : "No data found for the selected filters"}
                </td>
              </tr>
            ) : (
              filteredRakeDetails.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {row.wagonShiftingDetails && row.wagonShiftingDetails.length > 0 ? (
                    row.wagonShiftingDetails.map((tipler, tiplerIndex) => (
                      <tr key={`${rowIndex}-${tiplerIndex}`}>
                        {tiplerIndex === 0 && (
                          <>
                            <td rowSpan={row.wagonShiftingDetails.length}>{row.plant || "N/A"}</td>
                            <td rowSpan={row.wagonShiftingDetails.length}>{row.rakeNo || "N/A"}</td>
                            <td rowSpan={row.wagonShiftingDetails.length}>{row.adminName || "N/A"}</td>
                          </>
                        )}
                        <td>{tipler.key || "N/A"}</td>
                        <td>{tipler.startTime || "N/A"}</td>
                        <td>{tipler.noOfWagon || "N/A"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr key={`${rowIndex}-no-details`}>
                      <td>{row.plant || "N/A"}</td>
                      <td>{row.rakeNo || "N/A"}</td>
                      <td>{row.adminName || "N/A"}</td>
                      <td colSpan={3} className="no-data-message">
                        No wagon shifting details found
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Rakechange

