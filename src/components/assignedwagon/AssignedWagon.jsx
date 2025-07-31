// import './AssignedWagon.css';
// import * as XLSX from 'xlsx';
// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import { 
//   startOfDay, 
//   endOfDay, 
//   startOfWeek, 
//   endOfWeek, 
//   startOfMonth, 
//   endOfMonth, 
//   subDays, 
//   isWithinInterval, 
//   isValid 
// } from 'date-fns';

// const AssignedWagon = () => {
//     const [rakeDetails, setRakeDetails] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [sortOption, setSortOption] = useState('today');
//     const [customStartDate, setCustomStartDate] = useState('');
//     const [customEndDate, setCustomEndDate] = useState('');

//     useEffect(() => {
//         const fetchRakeDetails = async () => {
//             try {
//                 setLoading(true);
//                 const response = await axios.get('https://server-api-pearl.vercel.app/api/rakeDetails');

//                 if (response.data?.data) {
//                     const updatedDetails = response.data.data
//                         .map((item) => {
//                             const time24hr = convertTo24HourFormat(item.time);
//                             const combinedDateTime = `${item.date} ${time24hr}`;
//                             const dateTime = new Date(combinedDateTime);

//                             const wagonShiftingDetails = Object.keys(item.wagonShifting || {}).map(key => ({
//                                 key,
//                                 rakeNo: item.rakeNo,
//                                 dateTime,
//                                 ...item.wagonShifting[key],
//                             }));

//                             return {
//                                 ...item,
//                                 dateTime,
//                                 isCheckedOut: !!item.checkoutTime,
//                                 wagonShiftingDetails,
//                             };
//                         })
//                         .sort((a, b) => b.dateTime - a.dateTime);

//                     setRakeDetails(updatedDetails);
//                 } else {
//                     console.error('Invalid response structure:', response.data);
//                 }
//             } catch (error) {
//                 console.error('Error fetching rake details:', error);
//                 alert('Failed to fetch rake details.');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchRakeDetails();
//     }, []);

//     function convertTo24HourFormat(time) {
//         if (!time || typeof time !== 'string') {
//             return '00:00';
//         }

//         try {
//             const [hourMin, period] = time.trim().split(' ');
//             if (!hourMin || !period) return '00:00';

//             const [hour, minute] = hourMin.split(':').map(num => {
//                 const parsed = parseInt(num, 10);
//                 return isNaN(parsed) ? 0 : parsed;
//             });

//             const validHour = Math.min(Math.max(hour, 0), 23);
//             const validMinute = Math.min(Math.max(minute, 0), 59);
//             const adjustedHour = period.toLowerCase() === 'pm' && validHour !== 12 ? validHour + 12 : validHour;

//             return `${adjustedHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
//         } catch (error) {
//             console.error('Error converting time format:', error);
//             return '00:00';
//         }
//     }

//     const filterAssignedWagons = (wagon) => {
//         try {
//             const lowercasedQuery = searchQuery.toLowerCase();
//             const matchesSearch = wagon.rakeNo.toLowerCase().includes(lowercasedQuery) ||
//                                 wagon.key.toLowerCase().includes(lowercasedQuery);

//             if (!matchesSearch) return false;

//             const today = new Date();

//             if (!isValid(wagon.dateTime)) return false;

//             switch (sortOption) {
//                 case 'today':
//                     return isWithinInterval(wagon.dateTime, { 
//                         start: startOfDay(today), 
//                         end: endOfDay(today) 
//                     });
//                 case 'yesterday': {
//                     const yesterday = subDays(today, 1);
//                     return isWithinInterval(wagon.dateTime, { 
//                         start: startOfDay(yesterday), 
//                         end: endOfDay(yesterday) 
//                     });
//                 }
//                 case 'thisWeek':
//                     return isWithinInterval(wagon.dateTime, { 
//                         start: startOfWeek(today), 
//                         end: endOfWeek(today) 
//                     });
//                 case 'thisMonth':
//                     return isWithinInterval(wagon.dateTime, { 
//                         start: startOfMonth(today), 
//                         end: endOfMonth(today) 
//                     });
//                 case 'custom':
//                     if (customStartDate && customEndDate) {
//                         const start = new Date(customStartDate);
//                         const end = new Date(customEndDate);
//                         return isValid(start) && isValid(end) && 
//                                isWithinInterval(wagon.dateTime, { start, end });
//                     }
//                     return true;
//                 default:
//                     return true;
//             }
//         } catch (error) {
//             console.error('Error filtering wagon:', error);
//             return false;
//         }
//     };

//     const allWagons = rakeDetails.flatMap(item => item.wagonShiftingDetails);
//     const filteredWagons = allWagons.filter(wagon => !wagon.reason).filter(filterAssignedWagons);

//     const handleDownloadReport = () => {
//         const workbook = XLSX.utils.book_new();

//         const exportData = filteredWagons.map(wagon => ({
//             'Rake No': wagon.rakeNo,
//             'Wagon No': wagon.key,
//             'No Of Wagons': wagon.noOfWagon,
//         }));

//         const worksheet = XLSX.utils.json_to_sheet(exportData);
//         XLSX.utils.book_append_sheet(workbook, worksheet, 'Assigned Wagons Data');
//         XLSX.writeFile(workbook, `assigned_wagons_report_${new Date().toISOString().split('T')[0]}.xlsx`);
//     };

//     return (
//         <div className="assigned-wagon-container">
//             <div className="dashboard-header">
//                 <h2>Assigned Wagons</h2>
//                 <div className="search-container">
//                     <input
//                         type="text"
//                         className="search-input"
//                         placeholder="Search"
//                         value={searchQuery}
//                         onChange={(e) => setSearchQuery(e.target.value)}
//                     />
//                 </div>

//                 <div className="sort-container">
//                     <select 
//                         value={sortOption} 
//                         onChange={(e) => setSortOption(e.target.value)}
//                         className="sort-select"
//                     >
//                         <option value="today">Today</option>
//                         <option value="yesterday">Yesterday</option>
//                         <option value="thisWeek">This Week</option>
//                         <option value="thisMonth">This Month</option>
//                         <option value="custom">Custom</option>
//                         <option value="allData">All Data</option>
//                     </select>
//                     {sortOption === 'custom' && (
//                         <div className="custom-date-inputs">
//                             <input
//                                 type="date"
//                                 value={customStartDate}
//                                 onChange={(e) => setCustomStartDate(e.target.value)}
//                                 className="custom-date-input"
//                             />
//                             <input
//                                 type="date"
//                                 value={customEndDate}
//                                 onChange={(e) => setCustomEndDate(e.target.value)}
//                                 className="custom-date-input"
//                             />
//                         </div>
//                     )}
//                 </div>

//                 <button className="down-report-btn" onClick={handleDownloadReport}>
//                     Download Report
//                 </button>
//             </div>

//             <div className="table-container">
//                 <table className="assigned-wagon-table">
//                     <thead>
//                         <tr>
//                             <th>Rake No</th>
//                             <th>Wagon No</th>
//                             <th>No Of Wagons</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {loading ? (
//                             <tr>
//                                 <td colSpan="3">Loading...</td>
//                             </tr>
//                         ) : filteredWagons.length === 0 ? (
//                             <tr>
//                                 <td colSpan="3" className="no-data-message">No assigned wagons found</td>
//                             </tr>
//                         ) : (
//                             filteredWagons.map((wagon) => (
//                                 <tr key={`${wagon.rakeNo}-${wagon.key}`}>
//                                     <td>{wagon.rakeNo}</td>
//                                     <td>{wagon.key}</td>
//                                     <td>{wagon.noOfWagon}</td>
//                                 </tr>
//                             ))
//                         )}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };

// export default AssignedWagon;


// new code for assigned wagon


// import { useState, useEffect, useCallback } from "react"
// import { useNavigate } from "react-router-dom"
// import "./AssignedWagon.css"
// import * as XLSX from "xlsx"
// import axios from "axios"
// import {
//     startOfDay,
//     endOfDay,
//     startOfWeek,
//     endOfWeek,
//     startOfMonth,
//     endOfMonth,
//     subDays,
//     isWithinInterval,
//     isValid,
// } from "date-fns"
// import { Filter, Download, Search, Calendar, Building, History } from "lucide-react"


// const AssignedWagon = () => {
//     const navigate = useNavigate()
//     const [rakeDetails, setRakeDetails] = useState([]) // All data
//     const [plants, setPlants] = useState([]) // Store the list of plants
//     const [selectedPlant, setSelectedPlant] = useState("All") // Default selection
//     const [loading, setLoading] = useState(true) // Loading state
//     const [error, setError] = useState(null) // Error state
//     const [searchQuery, setSearchQuery] = useState("") // State for search query
//     const [sortOption, setSortOption] = useState("today") // Default sort option
//     const [customStartDate, setCustomStartDate] = useState("")
//     const [customEndDate, setCustomEndDate] = useState("")
//     const [lastFetchTime, setLastFetchTime] = useState(null)
//     const [debugInfo, setDebugInfo] = useState({}) // For debugging

//     // Constants
//     const POLL_INTERVAL = 10000 // 10 seconds
//     const API_URL = "https://server-api-pearl.vercel.app"
//     const MAX_RETRIES = 3
//     const RETRY_DELAY = 2000 // 2 seconds

//     // Get token from localStorage
//     const getToken = useCallback(() => {
//         return localStorage.getItem("token")
//     }, [])

//     // Config with authorization header
//     const getAuthConfig = useCallback(() => {
//         const token = getToken()
//         return {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//                 "Cache-Control": "no-cache",
//                 Pragma: "no-cache",
//             },
//             timeout: 10000, // 10 second timeout
//         }
//     }, [getToken])

//     // Enhanced time conversion with validation
//     const convertTo24HourFormat = useCallback((time) => {
//         if (!time || typeof time !== "string") {
//             return "00:00"
//         }

//         try {
//             const [hourMin, period] = time.trim().split(" ")
//             if (!hourMin || !period) return "00:00"

//             const [hour, minute] = hourMin.split(":").map((num) => {
//                 const parsed = Number.parseInt(num, 10)
//                 return isNaN(parsed) ? 0 : parsed
//             })

//             const validHour = Math.min(Math.max(hour, 0), 23)
//             const validMinute = Math.min(Math.max(minute, 0), 59)
//             const adjustedHour = period.toLowerCase() === "pm" && validHour !== 12 ? validHour + 12 : validHour

//             return `${adjustedHour.toString().padStart(2, "0")}:${validMinute.toString().padStart(2, "0")}`
//         } catch (error) {
//             console.error("Error converting time format:", error)
//             return "00:00"
//         }
//     }, [])

//     // Function to safely parse date
//     const parseSafeDate = useCallback(
//         (dateStr, timeStr) => {
//             try {
//                 const time24hr = convertTo24HourFormat(timeStr)
//                 const combinedDateTime = `${dateStr} ${time24hr}`
//                 const dateTime = new Date(combinedDateTime)
//                 return isValid(dateTime) ? dateTime : new Date()
//             } catch (error) {
//                 console.error("Error parsing date:", error)
//                 return new Date()
//             }
//         },
//         [convertTo24HourFormat],
//     )

//     // Fetch plants from the API with improved error handling
//     const fetchPlants = useCallback(async () => {
//         try {
//             // Get all plants managed by the admin
//             const response = await axios.get(`${API_URL}/api/admin/plants`, getAuthConfig())
//             console.log("Plants API Response:", response.data) // Log the response for debugging

//             // Add more robust error handling and response structure verification
//             if (response.data) {
//                 // Check various possible response structures
//                 let plantData = []

//                 if (Array.isArray(response.data)) {
//                     // If response.data is directly an array
//                     plantData = response.data
//                 } else if (response.data.data && Array.isArray(response.data.data)) {
//                     // If response.data has a data property that's an array
//                     plantData = response.data.data
//                 } else if (response.data.plants && Array.isArray(response.data.plants)) {
//                     // Try another possible structure
//                     plantData = response.data.plants
//                 } else if (response.data.result && Array.isArray(response.data.result)) {
//                     // One more possible structure
//                     plantData = response.data.result
//                 } else {
//                     console.warn("Unexpected response structure:", response.data)
//                     // If we can't find an array, use an empty array
//                     plantData = []
//                 }

//                 // Extract unique plant names, with better error handling
//                 const plantNames = plantData
//                     .filter((plant) => plant && typeof plant === "object")
//                     .map((plant) => {
//                         // Add additional logging to debug plant data
//                         console.log("Plant data:", plant)
//                         // Look for name in different possible locations
//                         return plant.name || plant.plantName || plant.plant || ""
//                     })
//                     .filter(Boolean)

//                 console.log("Extracted plant names:", plantNames)
//                 setPlants(plantNames)

//                 if (plantNames.length === 0) {
//                     console.warn("No valid plant names found in response")
//                 }
//             } else {
//                 throw new Error("No data received from server")
//             }
//         } catch (error) {
//             console.error("Error fetching plants:", error)
//             setError("Failed to fetch plants: " + (error.message || "Unknown error"))

//             // Set empty plants array to prevent UI issues
//             setPlants([])
//         }
//     }, [getAuthConfig, API_URL])

//     // Enhanced fetch function with retries and plant filtering - with improved error handling
//     const fetchRakeDetails = useCallback(
//         async (retryCount = 0) => {
//             try {
//                 // Prevent too frequent requests
//                 const now = Date.now()
//                 if (lastFetchTime && now - lastFetchTime < 5000) {
//                     // 5 second minimum interval
//                     return
//                 }

//                 // Get all plants and their rake details
//                 const response = await axios.get(`${API_URL}/api/admin/plants`, getAuthConfig())
//                 console.log("Rake Details API Response:", response.data) // Log the response for debugging

//                 setLastFetchTime(now)
//                 setError(null)

//                 if (!response.data) {
//                     throw new Error("No data received from server")
//                 }

//                 // Process different possible response structures
//                 let plantsData = []
//                 if (Array.isArray(response.data)) {
//                     plantsData = response.data
//                 } else if (response.data.data && Array.isArray(response.data.data)) {
//                     plantsData = response.data.data
//                 } else if (response.data.plants && Array.isArray(response.data.plants)) {
//                     plantsData = response.data.plants
//                 } else if (response.data.result && Array.isArray(response.data.result)) {
//                     plantsData = response.data.result
//                 } else {
//                     console.warn("Unexpected response structure:", response.data)
//                     plantsData = []
//                 }

//                 // Create a debug object to track what's happening
//                 const debug = {
//                     totalPlantsReceived: plantsData.length,
//                     plantsProcessed: 0,
//                     plantNames: [],
//                     selectedPlant,
//                     plantsMatchingSelection: 0,
//                     totalAssignedWagonsFound: 0,
//                     plantsWithNoData: [],
//                 }

//                 let allRakeDetails = []

//                 // Process each plant
//                 plantsData.forEach((plant) => {
//                     // Ensure plant is a valid object
//                     if (!plant || typeof plant !== "object") {
//                         console.log("Invalid plant object:", plant)
//                         return
//                     }

//                     debug.plantsProcessed++

//                     // Get plant name from different possible properties
//                     const plantName = plant.name || plant.plantName || plant.plant || ""
//                     debug.plantNames.push(plantName)

//                     console.log(`Processing plant: "${plantName}", Selected plant: "${selectedPlant}"`)

//                     // Skip if a specific plant is selected and this isn't it
//                     // More flexible comparison - case insensitive and trim
//                     const shouldProcessPlant =
//                         selectedPlant === "All" || plantName.trim().toLowerCase() === selectedPlant.trim().toLowerCase()

//                     if (!shouldProcessPlant) {
//                         console.log(`Skipping plant "${plantName}" because it doesn't match selected plant "${selectedPlant}"`)
//                         return
//                     }

//                     debug.plantsMatchingSelection++
//                     console.log(`Found matching plant: ${plantName}`)

//                     // Process rake details for this plant
//                     if (plant.rakeDetails && Array.isArray(plant.rakeDetails)) {
//                         console.log(`Plant ${plantName} has ${plant.rakeDetails.length} rake details`)

//                         if (plant.rakeDetails.length === 0) {
//                             debug.plantsWithNoData.push(plantName)
//                         }

//                         const plantRakeDetails = plant.rakeDetails
//                             .filter((item) => item && typeof item === "object")
//                             .map((item) => {
//                                 try {
//                                     const dateTime = parseSafeDate(item.date, item.time)

//                                     // Safely parse wagon shifting details - only include assigned wagons (no reason property)
//                                     const wagonShiftingDetails = item.wagonShifting
//                                         ? Object.keys(item.wagonShifting)
//                                             .map((key) => ({
//                                                 key,
//                                                 rakeNo: item.rakeNo,
//                                                 plant: plantName,
//                                                 dateTime,
//                                                 ...item.wagonShifting[key],
//                                             }))
//                                             .filter((detail) => detail && typeof detail === "object" && !detail.reason)
//                                         : []

//                                     debug.totalAssignedWagonsFound += wagonShiftingDetails.length

//                                     return {
//                                         ...item,
//                                         plant: plantName, // Add plant name
//                                         plantId: plant._id || "", // Store plant ID if needed
//                                         dateTime,
//                                         wagonShiftingDetails,
//                                     }
//                                 } catch (error) {
//                                     console.error("Error processing rake item:", error)
//                                     return null
//                                 }
//                             })
//                             .filter(Boolean) // Remove any null items from processing errors

//                         console.log(`Added ${plantRakeDetails.length} valid rake details from plant ${plantName}`)
//                         allRakeDetails = [...allRakeDetails, ...plantRakeDetails]
//                     } else {
//                         console.log(`Plant ${plantName} has no rake details array`)
//                         debug.plantsWithNoData.push(plantName)
//                     }
//                 })

//                 // Set debug info for troubleshooting
//                 setDebugInfo(debug)
//                 console.log("Filtering debug info:", debug)

//                 // Sort all rake details by dateTime (most recent first)
//                 allRakeDetails.sort((a, b) => b.dateTime - a.dateTime)
//                 setRakeDetails(allRakeDetails)

//                 console.log(`Total rake details after processing: ${allRakeDetails.length}`)
//             } catch (error) {
//                 console.error("Error fetching rake details:", error)
//                 setError(error.message || "Unknown error occurred")

//                 // Implement retry logic
//                 if (retryCount < MAX_RETRIES) {
//                     setTimeout(
//                         () => {
//                             fetchRakeDetails(retryCount + 1)
//                         },
//                         RETRY_DELAY * (retryCount + 1),
//                     )
//                 }
//             } finally {
//                 setLoading(false)
//             }
//         },
//         [lastFetchTime, selectedPlant, getAuthConfig, parseSafeDate],
//     )

//     // Initial fetch for plants and rake details
//     useEffect(() => {
//         // Check if user is authenticated
//         if (!getToken()) {
//             navigate("/login")
//             return
//         }

//         fetchPlants()
//         fetchRakeDetails()
//     }, [fetchPlants, fetchRakeDetails, navigate, getToken])

//     // Refetch rake details when selected plant changes
//     useEffect(() => {
//         console.log("Selected plant changed to:", selectedPlant)
//         fetchRakeDetails()
//     }, [selectedPlant, fetchRakeDetails])

//     // Polling setup with error handling
//     useEffect(() => {
//         let pollInterval

//         if (!error) {
//             pollInterval = setInterval(() => {
//                 fetchRakeDetails()
//             }, POLL_INTERVAL)
//         }

//         return () => {
//             if (pollInterval) {
//                 clearInterval(pollInterval)
//             }
//         }
//     }, [fetchRakeDetails, error])

//     // Safe filter function for assigned wagons
//     const safeFilterAssignedWagons = useCallback(
//         (wagon) => {
//             try {
//                 // First, filter by search query
//                 if (searchQuery) {
//                     const lowercasedQuery = searchQuery.toLowerCase()
//                     const matchesSearch =
//                         (wagon.rakeNo?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
//                             wagon.key?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
//                             wagon.plant?.toString()?.toLowerCase()?.includes(lowercasedQuery)) ??
//                         false

//                     if (!matchesSearch) return false
//                 }

//                 // Then apply date filters
//                 if (sortOption === "allData") {
//                     // For "allData", return everything that made it past the search query filter
//                     return true
//                 }

//                 const today = new Date()

//                 if (!isValid(wagon.dateTime)) {
//                     console.log("Invalid date for wagon:", wagon)
//                     return false
//                 }

//                 switch (sortOption) {
//                     case "today":
//                         return isWithinInterval(wagon.dateTime, {
//                             start: startOfDay(today),
//                             end: endOfDay(today),
//                         })
//                     case "yesterday": {
//                         const yesterday = subDays(today, 1)
//                         return isWithinInterval(wagon.dateTime, {
//                             start: startOfDay(yesterday),
//                             end: endOfDay(yesterday),
//                         })
//                     }
//                     case "thisWeek":
//                         return isWithinInterval(wagon.dateTime, {
//                             start: startOfWeek(today),
//                             end: endOfWeek(today),
//                         })
//                     case "thisMonth":
//                         return isWithinInterval(wagon.dateTime, {
//                             start: startOfMonth(today),
//                             end: endOfMonth(today),
//                         })
//                     case "custom":
//                         if (customStartDate && customEndDate) {
//                             const start = startOfDay(new Date(customStartDate))
//                             const end = endOfDay(new Date(customEndDate))
//                             return isValid(start) && isValid(end) && isWithinInterval(wagon.dateTime, { start, end })
//                         }
//                         return true
//                     default:
//                         return true
//                 }
//             } catch (error) {
//                 console.error("Error filtering wagon:", error)
//                 return false
//             }
//         },
//         [searchQuery, sortOption, customStartDate, customEndDate],
//     )

//     // Get all assigned wagons from all rakes
//     const allAssignedWagons = rakeDetails.flatMap((rake) => rake.wagonShiftingDetails || [])

//     // Filter assigned wagons based on search and date criteria
//     const filteredAssignedWagons = allAssignedWagons.filter(safeFilterAssignedWagons)

//     // Safe download function
//     const downloadReport = useCallback(() => {
//         try {
//             const workbook = XLSX.utils.book_new()
//             const exportData = filteredAssignedWagons.map((wagon) => ({
//                 Plant: wagon.plant || "N/A",
//                 "Rake No": wagon.rakeNo || "N/A",
//                 "Wagon No": wagon.key || "N/A",
//                 "No Of Wagons": wagon.noOfWagon || "N/A",
//             }))

//             const worksheet = XLSX.utils.json_to_sheet(exportData)
//             XLSX.utils.book_append_sheet(workbook, worksheet, "Assigned Wagons Data")
//             XLSX.writeFile(workbook, `assigned_wagons_report_${new Date().toISOString().split("T")[0]}.xlsx`)
//         } catch (error) {
//             console.error("Error downloading report:", error)
//             alert("Failed to download report. Please try again.")
//         }
//     }, [filteredAssignedWagons])

//     // Handle plant selection - normalize it first
//     const handlePlantSelection = (value) => {
//         console.log("Plant selection changed to:", value)
//         setSelectedPlant(value)
//     }

//     return (
//         <div className="assigned-wagon-container">
//             <div className="dashboard-header">
//                 <h2>Assigned Wagons Dashboard</h2>
//                 {error && <div className="error-message">Error: {error}. Retrying...</div>}
//                 <div className="search-container">
//                     <input
//                         type="text"
//                         className="search-input"
//                         placeholder="Search"
//                         value={searchQuery}
//                         onChange={(e) => setSearchQuery(e.target.value)}
//                     />
//                 </div>

//                 {/* Plant Filter Dropdown */}
//                 <div className="plant-filter-container">
//                     <select value={selectedPlant} onChange={(e) => handlePlantSelection(e.target.value)} className="plant-select">
//                         <option value="All">All Plants</option>
//                         {plants.map((plant, index) => (
//                             <option key={index} value={plant}>
//                                 {plant}
//                             </option>
//                         ))}
//                     </select>
//                 </div>

//                 {/* Sort Container */}
//                 <div className="sort-container">
//                     <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="sort-select">
//                         <option value="today">Today</option>
//                         <option value="yesterday">Yesterday</option>
//                         <option value="thisWeek">This Week</option>
//                         <option value="thisMonth">This Month</option>
//                         <option value="custom">Custom</option>
//                         <option value="allData">All Data</option>
//                     </select>
//                     {sortOption === "custom" && (
//                         <div className="custom-date-inputs">
//                             <input
//                                 type="date"
//                                 value={customStartDate}
//                                 onChange={(e) => setCustomStartDate(e.target.value)}
//                                 className="custom-date-input"
//                             />
//                             <input
//                                 type="date"
//                                 value={customEndDate}
//                                 onChange={(e) => setCustomEndDate(e.target.value)}
//                                 className="custom-date-input"
//                             />
//                         </div>
//                     )}
//                 </div>

//                 {/* Download Report Button */}
//                 <button className="down-report-btn" onClick={downloadReport} disabled={loading || error}>
//                     Download Report
//                 </button>
//             </div>

//             {/* Debug Info - Enable during development */}
//             {/* <div className="debug-info" style={{padding: '10px', background: '#f5f5f5', margin: '10px 0', fontSize: '12px'}}>
//                 <h4>Debug Info:</h4>
//                 <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
//                 <p>Selected Plant: {selectedPlant}</p>
//                 <p>Total Plants: {plants.length}</p>
//                 <p>Plant Names: {plants.join(', ')}</p>
//                 <p>Total Assigned Wagons: {allAssignedWagons.length}</p>
//                 <p>Filtered Assigned Wagons: {filteredAssignedWagons.length}</p>
//                 <p>Current Filter: {sortOption}</p>
//             </div> */}

//             <div className="table-container">
//                 <table className="assigned-wagon-table">
//                     <thead>
//                         <tr>
//                             <th>Plant</th>
//                             <th>Rake No</th>
//                             <th>Wagon No</th>
//                             <th>No Of Wagons</th>
//                         </tr>
//                     </thead>
//                     {loading ? (
//                         <tbody>
//                             <tr>
//                                 <td colSpan="4" className="loading-message">
//                                     Loading...
//                                 </td>
//                             </tr>
//                         </tbody>
//                     ) : filteredAssignedWagons.length === 0 ? (
//                         <tbody>
//                             <tr>
//                                 <td colSpan="4" className="no-data-message">
//                                     {error ? "Error loading data" : "No assigned wagons found"}
//                                 </td>
//                             </tr>
//                         </tbody>
//                     ) : (
//                         <tbody>
//                             {filteredAssignedWagons.map((wagon, index) => (
//                                 <tr key={`${wagon.rakeNo}-${wagon.key}-${index}`}>
//                                     <td>{wagon.plant || "N/A"}</td>
//                                     <td>{wagon.rakeNo || "N/A"}</td>
//                                     <td>{wagon.key || "N/A"}</td>
//                                     <td>{wagon.noOfWagon || "N/A"}</td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     )}
//                 </table>
//             </div>
//         </div>
//     )
// }

// export default AssignedWagon




// new improved ui 


import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import "./AssignedWagon.css"
import * as XLSX from "xlsx"
import axios from "axios"
import Excel from 'exceljs'
// const Excel = require('exceljs')
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

const AssignedWagon = () => {
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

    // Helper function to normalize strings for comparison
    const normalizeString = (str) => {
        return str ? str.trim().toLowerCase() : ""
    }

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
    }, [getAuthConfig, API_URL])

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
                    totalAssignedWagonsFound: 0,
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
                            .filter((item) => item && typeof item === "object")
                            .map((item) => {
                                try {
                                    const dateTime = parseSafeDate(item.date, item.time)

                                    // Safely parse wagon shifting details - only include assigned wagons (no reason property)
                                    const wagonShiftingDetails = item.wagonShifting
                                        ? Object.keys(item.wagonShifting)
                                            .map((key) => ({
                                                key,
                                                rakeNo: item.rakeNo,
                                                plant: plantName,
                                                dateTime,
                                                ...item.wagonShifting[key],
                                            }))
                                            .filter((detail) => detail && typeof detail === "object" && !detail.reason)
                                        : []

                                    debug.totalAssignedWagonsFound += wagonShiftingDetails.length

                                    return {
                                        ...item,
                                        plant: plantName, // Add plant name
                                        plantId: plant._id || "", // Store plant ID if needed
                                        dateTime,
                                        wagonShiftingDetails,
                                    }
                                } catch (error) {
                                    console.error("Error processing rake item:", error)
                                    return null
                                }
                            })
                            .filter(Boolean) // Remove any null items from processing errors

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
        [lastFetchTime, getAuthConfig, parseSafeDate, appliedFilters.plant, normalizeString, API_URL],
    )

    // Initial fetch for plants and rake details
    useEffect(() => {
        // Check if user is authenticated
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

    // Safe filter function for assigned wagons
    const safeFilterAssignedWagons = useCallback(
        (wagon) => {
            try {
                // First, filter by search query
                if (searchQuery) {
                    const lowercasedQuery = searchQuery.toLowerCase()
                    const matchesSearch =
                        (wagon.rakeNo?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
                            wagon.key?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
                            wagon.plant?.toString()?.toLowerCase()?.includes(lowercasedQuery)) ??
                        false

                    if (!matchesSearch) return false
                }

                // Then apply date filters
                if (appliedFilters.filter === "allData") {
                    // For "allData", return everything that made it past the search query filter
                    return true
                }

                const today = new Date()

                if (!isValid(wagon.dateTime)) {
                    console.log("Invalid date for wagon:", wagon)
                    return false
                }

                switch (appliedFilters.filter) {
                    case "today":
                        return isWithinInterval(wagon.dateTime, {
                            start: startOfDay(today),
                            end: endOfDay(today),
                        })
                    case "yesterday": {
                        const yesterday = subDays(today, 1)
                        return isWithinInterval(wagon.dateTime, {
                            start: startOfDay(yesterday),
                            end: endOfDay(yesterday),
                        })
                    }
                    case "thisWeek":
                        return isWithinInterval(wagon.dateTime, {
                            start: startOfWeek(today),
                            end: endOfWeek(today),
                        })
                    case "thisMonth":
                        return isWithinInterval(wagon.dateTime, {
                            start: startOfMonth(today),
                            end: endOfMonth(today),
                        })
                    case "custom":
                        if (customStartDate && customEndDate) {
                            const start = startOfDay(new Date(customStartDate))
                            const end = endOfDay(new Date(customEndDate))
                            return isValid(start) && isValid(end) && isWithinInterval(wagon.dateTime, { start, end })
                        }
                        return true
                    default:
                        return true
                }
            } catch (error) {
                console.error("Error filtering wagon:", error)
                return false
            }
        },
        [searchQuery, customStartDate, customEndDate, appliedFilters.filter],
    )

    // Get all assigned wagons from all rakes
    const allAssignedWagons = rakeDetails.flatMap((rake) => rake.wagonShiftingDetails || [])

    // Filter assigned wagons based on search and date criteria
    const filteredAssignedWagons = allAssignedWagons.filter(safeFilterAssignedWagons)

    // Safe download function
    
    // const downloadReport = useCallback(() => {
    //     try {
    //         const workbook = XLSX.utils.book_new()
    //         const exportData = filteredAssignedWagons.map((wagon) => ({
    //             Plant: wagon.plant || "N/A",
    //             "Rake No": wagon.rakeNo || "N/A",
    //             "Wagon No": wagon.key || "N/A",
    //             "No Of Wagons": wagon.noOfWagon || "N/A",
    //         }))

    //         const worksheet = XLSX.utils.json_to_sheet(exportData)
    //         XLSX.utils.book_append_sheet(workbook, worksheet, "Assigned Wagons Data")
    //         XLSX.writeFile(workbook, `assigned_wagons_report_${new Date().toISOString().split("T")[0]}.xlsx`)
    //     } catch (error) {
    //         console.error("Error downloading report:", error)
    //         alert("Failed to download report. Please try again.")
    //     }
    // }, [filteredAssignedWagons])


    // const downloadReport = useCallback(() => {
    //     try {
    //         // Create a new workbook
    //         const workbook = XLSX.utils.book_new();

    //         // Create worksheet with title row and header row
    //         const worksheet = XLSX.utils.aoa_to_sheet([
    //             ["ASSIGNED WAGONS REPORT"], // Title row
    //             [
    //                 "Plant",
    //                 "Rake No",
    //                 "Wagon No",
    //                 "No Of Wagons"
    //             ], // Header row
    //         ]);

    //         // Add data rows
    //         const dataRows = filteredAssignedWagons.map(wagon => [
    //             wagon.plant || "N/A",
    //             wagon.rakeNo || "N/A",
    //             wagon.key || "N/A",
    //             wagon.noOfWagon || "N/A"
    //         ]);

    //         // Start adding data from row 3 (after title and header)
    //         XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A3" });

    //         // Merge cells for the title
    //         if (!worksheet['!merges']) worksheet['!merges'] = [];
    //         worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }); // Merge all 4 columns in row 0

    //         // Set column widths
    //         worksheet['!cols'] = [
    //             { wch: 15 },  // Plant
    //             { wch: 15 },  // Rake No
    //             { wch: 15 },  // Wagon No
    //             { wch: 15 },  // No Of Wagons
    //         ];

    //         // Add cell styles
    //         for (let i = 0; i < 4; i++) {
    //             // Style title row (row 0)
    //             const titleCellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    //             if (!worksheet[titleCellRef]) worksheet[titleCellRef] = { v: worksheet[titleCellRef]?.v || "" };
    //             worksheet[titleCellRef].s = {
    //                 font: { bold: true, sz: 14 },
    //                 alignment: { horizontal: "center", vertical: "center" }
    //             };

    //             // Style header row (row 1)
    //             const headerCellRef = XLSX.utils.encode_cell({ r: 1, c: i });
    //             if (!worksheet[headerCellRef]) worksheet[headerCellRef] = { v: worksheet[headerCellRef]?.v || "" };
    //             worksheet[headerCellRef].s = {
    //                 font: { bold: true },
    //                 alignment: { horizontal: "center", vertical: "center" }
    //             };
    //         }

    //         // Add the worksheet to the workbook
    //         XLSX.utils.book_append_sheet(workbook, worksheet, "Assigned Wagons Data");

    //         // For XLSX with styles, we need to use XLSX.write to get a binary string
    //         // and then create a blob to download
    //         const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary', cellStyles: true });

    //         // Convert binary string to ArrayBuffer
    //         function s2ab(s) {
    //             const buf = new ArrayBuffer(s.length);
    //             const view = new Uint8Array(buf);
    //             for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    //             return buf;
    //         }

    //         // Create a blob and trigger download
    //         const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    //         const fileName = `assigned_wagons_report_${new Date().toISOString().split("T")[0]}.xlsx`;

    //         // Create download link and trigger click
    //         const url = window.URL.createObjectURL(blob);
    //         const a = document.createElement('a');
    //         a.href = url;
    //         a.download = fileName;
    //         a.click();
    //         window.URL.revokeObjectURL(url);

    //     } catch (error) {
    //         console.error("Error downloading report:", error);
    //         alert("Failed to download report. Please try again.");
    //     }
    // }, [filteredAssignedWagons]);

    const downloadReport = useCallback(() => {
        try {
            // Create a new workbook
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet("My Sheet");
    
            // Set default row height
            // sheet.properties.defaultRowHeight = 80;

            sheet.getRow(1).border = {
                top:{style:'thick', color:{argb:"FFFF00000"}},
                bottom:{style:'thick', color:{argb:"FFFF00000"}},
                right:{style:'thick', color:{argb:"FFFF00000"}},
                left:{style:'thick', color:{argb:"FFFF00000"}}
            }
    
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            // Define columns for the sheet
            sheet.columns = [
                {
                    header: "Id",
                    key: "id",
                    width: 10
                },
                {
                    header: "Plant",
                    key: "plant",
                    width: 10
                },
                {
                    header: "No of Wagons",
                    key: "no",
                    width: 15
                },
                {
                    header: "Wagon",
                    key: "wagon",
                    width: 10
                }
            ];
    
            // Add rows from filteredAssignedWagons
            filteredAssignedWagons.forEach(wagon => {
                sheet.addRow({
                    id: wagon.key,
                    plant: wagon.plant,
                    no: wagon.rakeNo,
                    wagon: wagon.noOfWagon
                });
            });
    
            // Generate the Excel buffer
            workbook.xlsx.writeBuffer().then((data) => {
                // Create a Blob with the generated buffer
                const blob = new Blob([data], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                });
    
                // Create a download link
                const url = window.URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "assigned_wagons_report.xlsx"; // Define a file name here
                anchor.click();
    
                // Clean up the object URL
                window.URL.revokeObjectURL(url);
            });
        } catch (error) {
            console.error("Error downloading report:", error);
            alert("Failed to download report. Please try again.");
        }
    }, [filteredAssignedWagons]);
    

    // Apply filters function - to be called when the filter button is clicked
    const applyFilters = () => {
        setAppliedFilters({
            plant: selectedPlant,
            filter: sortOption,
        })
        console.log("Applying filters:", { plant: selectedPlant, filter: sortOption })
    }

    return (
        <div className="assigned-wagon-container">
            <div className="dashboard-header">
                <h2>Assigned Wagons Dashboard</h2>
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
                <table className="assigned-wagon-table">
                    <thead>
                        <tr>
                            <th>Plant</th>
                            <th>Rake No</th>
                            <th>Wagon No</th>
                            <th>No Of Wagons</th>
                        </tr>
                    </thead>
                    {loading ? (
                        <tbody>
                            <tr>
                                <td colSpan="4" className="loading-message">
                                    Loading...
                                </td>
                            </tr>
                        </tbody>
                    ) : filteredAssignedWagons.length === 0 ? (
                        <tbody>
                            <tr>
                                <td colSpan="4" className="no-data-message">
                                    {error ? "Error loading data" : "No data found for the selected filters"}
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody>
                            {filteredAssignedWagons.map((wagon, index) => (
                                <tr key={`${wagon.rakeNo}-${wagon.key}-${index}`}>
                                    <td>{wagon.plant || "N/A"}</td>
                                    <td>{wagon.rakeNo || "N/A"}</td>
                                    <td>{wagon.key || "N/A"}</td>
                                    <td>{wagon.noOfWagon || "N/A"}</td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>
        </div>
    )
}

export default AssignedWagon

