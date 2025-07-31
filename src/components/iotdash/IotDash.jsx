// import { useState, useEffect } from 'react';
// import './IotDash.css';
// import * as XLSX from 'xlsx';
// import axios from 'axios';
// import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval, isValid } from 'date-fns';

// const IotDash = () => {
//   const [rakeDetails, setRakeDetails] = useState([]); // All data
//   const [loading, setLoading] = useState(true); // Loading state
//   const [searchQuery, setSearchQuery] = useState(''); // State for search query
//   const [sortOption, setSortOption] = useState('today'); // Default sort option
//   const [customStartDate, setCustomStartDate] = useState('');
//   const [customEndDate, setCustomEndDate] = useState('');

//   useEffect(() => {
//     const fetchRakeDetails = async () => {
//       try {
//         setLoading(true);
//         const response = await axios.get('https://server-api-pearl.vercel.app/api/rakeDetails');

//         if (response.data?.data) {
//           const updatedDetails = response.data.data
//             .map((item) => {
//               const time24hr = convertTo24HourFormat(item.time);
//               const combinedDateTime = `${item.date} ${time24hr}`;
//               const dateTime = new Date(combinedDateTime);

//               return {
//                 ...item,
//                 dateTime,
//                 isCheckedOut: !!item.checkoutTime,
//                 wagons: parseInt(item.wagons, 10) || 0,
//                 bulgingWagons: parseInt(item.bulgingWagons, 10) || 0,
//                 rightBulging: parseInt(item.rightBulging, 10) || 0,
//                 leftBulging: parseInt(item.leftBulging, 10) || 0
//               };
//             })
//             .sort((a, b) => b.dateTime - a.dateTime);

//           setRakeDetails(updatedDetails);
//         }
//       } catch (error) {
//         console.error('Error fetching rake details:', error);
//         alert('Failed to fetch rake details.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchRakeDetails();
//   }, []);

//   function convertTo24HourFormat(time) {
//     if (!time || typeof time !== 'string') {
//       return '00:00';
//     }

//     try {
//       const [hourMin, period] = time.trim().split(' ');
//       if (!hourMin || !period) return '00:00';

//       const [hour, minute] = hourMin.split(':').map(num => {
//         const parsed = parseInt(num, 10);
//         return isNaN(parsed) ? 0 : parsed;
//       });

//       const validHour = Math.min(Math.max(hour, 0), 23);
//       const validMinute = Math.min(Math.max(minute, 0), 59);
//       const adjustedHour = period.toLowerCase() === 'pm' && validHour !== 12 ? validHour + 12 : validHour;

//       return `${adjustedHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}`;
//     } catch (error) {
//       console.error('Error converting time format:', error);
//       return '00:00';
//     }
//   }

//   // Filter function combining search and date filters
//   const filterRakeDetails = (rake) => {
//     try {
//       // Search filter
//       const lowercasedQuery = searchQuery.toLowerCase();
//       const matchesSearch = rake.rakeNo.toLowerCase().includes(lowercasedQuery);

//       if (!matchesSearch) return false;

//       // Date filter
//       const today = new Date();

//       if (!isValid(rake.dateTime)) return false;

//       switch (sortOption) {
//         case 'today':
//           return isWithinInterval(rake.dateTime, { 
//             start: startOfDay(today), 
//             end: endOfDay(today) 
//           });
//         case 'yesterday': {
//           const yesterday = subDays(today, 1);
//           return isWithinInterval(rake.dateTime, { 
//             start: startOfDay(yesterday), 
//             end: endOfDay(yesterday) 
//           });
//         }
//         case 'thisWeek':
//           return isWithinInterval(rake.dateTime, { 
//             start: startOfWeek(today), 
//             end: endOfWeek(today) 
//           });
//         case 'thisMonth':
//           return isWithinInterval(rake.dateTime, { 
//             start: startOfMonth(today), 
//             end: endOfMonth(today) 
//           });
//         case 'custom':
//           if (customStartDate && customEndDate) {
//             const start = new Date(customStartDate);
//             const end = new Date(customEndDate);
//             return isValid(start) && isValid(end) && 
//                    isWithinInterval(rake.dateTime, { start, end });
//           }
//           return true;
//         default:
//           return true;
//       }
//     } catch (error) {
//       console.error('Error filtering rake:', error);
//       return false;
//     }
//   };

//   const filteredIotDetails = rakeDetails.filter(filterRakeDetails);

//   const handleDownloadReport = () => {
//     const workbook = XLSX.utils.book_new();

//     const exportData = filteredIotDetails.map(rakeDetails => ({
//       'Rake No': rakeDetails.rakeNo,
//       'Arrival Date': rakeDetails.date,
//       'Check In Time': rakeDetails.time,
//       'Total Wagons': rakeDetails.wagons,
//       'Bulging Wagons': rakeDetails.bulgingWagons,
//       'Right Bulging': rakeDetails.rightBulging,
//       'Left Bulging': rakeDetails.leftBulging
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(exportData);
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Iot Dashboard Data');
//     XLSX.writeFile(workbook, `iot_dashboard_report_${new Date().toISOString().split('T')[0]}.xlsx`);
//   };

//   return (
//     <div className="iotdash-container">
//       <div className="dashboard-header">
//         <h2>IoT Dashboard</h2>
//         <div className="search-container">
//           <input
//             type="text"
//             className="search-input"
//             placeholder="Search"
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//           />
//         </div>

//         <div className="sort-container">
//           <select 
//             value={sortOption} 
//             onChange={(e) => setSortOption(e.target.value)}
//             className="sort-select"
//           >
//             <option value="today">Today</option>
//             <option value="yesterday">Yesterday</option>
//             <option value="thisWeek">This Week</option>
//             <option value="thisMonth">This Month</option>
//             <option value="custom">Custom</option>
//             <option value="allData">All Data</option>
//           </select>
//           {sortOption === 'custom' && (
//             <div className="custom-date-inputs">
//               <input
//                 type="date"
//                 value={customStartDate}
//                 onChange={(e) => setCustomStartDate(e.target.value)}
//                 className="custom-date-input"
//               />
//               <input
//                 type="date"
//                 value={customEndDate}
//                 onChange={(e) => setCustomEndDate(e.target.value)}
//                 className="custom-date-input"
//               />
//             </div>
//           )}
//         </div>

//         <button className="down-report-btn" onClick={handleDownloadReport}>
//           Download Report
//         </button>
//       </div>

//       <div className="table-container">
//         <table className="iot-table">
//           <thead>
//             <tr>
//               <th>Rake No</th>
//               <th>Arrival Date</th>
//               <th>Check In Time</th>
//               <th>Total Wagons</th>
//               <th>Bulging Wagons</th>
//               <th>Right Bulging</th>
//               <th>Left Bulging</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan="7">Loading...</td>
//               </tr>
//             ) : filteredIotDetails.length === 0 ? (
//               <tr>
//                 <td colSpan="7" className="no-data-message">No data found</td>
//               </tr>
//             ) : (
//               filteredIotDetails.map((rakeDetails) => (
//                 <tr key={rakeDetails._id || Math.random().toString()}>
//                   <td>{rakeDetails.rakeNo}</td>
//                   <td>{rakeDetails.date}</td>
//                   <td>{rakeDetails.time}</td>
//                   <td>{rakeDetails.wagons}</td>
//                   <td>{rakeDetails.bulgingWagons}</td>
//                   <td>{rakeDetails.rightBulging}</td>
//                   <td>{rakeDetails.leftBulging}</td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default IotDash;


import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./IotDash.css";
import * as XLSX from "xlsx";
import axios from "axios";
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
} from "date-fns";
import { Filter, Download, Search, Calendar, Building, History } from "lucide-react";

const IotDash = () => {
    const navigate = useNavigate();
    const [rakeDetails, setRakeDetails] = useState([]); // All data
    const [plants, setPlants] = useState([]); // Store the list of plants
    const [selectedPlant, setSelectedPlant] = useState("All"); // Default selection
    const [loading, setLoading] = useState(true); // Loading state
    const [error, setError] = useState(null); // Error state
    const [searchQuery, setSearchQuery] = useState(""); // State for search query
    const [sortOption, setSortOption] = useState("today"); // Default sort option
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [appliedFilters, setAppliedFilters] = useState({
        plant: "All",
        filter: "today",
    }); // Track currently applied filters

    // Constants
    const POLL_INTERVAL = 10000; // 10 seconds
    const API_URL = "https://honeydew-hare-753841.hostingersite.com/add-wagon?getAll=true";
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    // Get token from localStorage
    const getToken = () => {
        return localStorage.getItem("token");
    };

    // Helper function to normalize strings for comparison
    const normalizeString = (str) => {
        return str ? str.trim().toLowerCase() : "";
    };

    // Fetch plants from the API with improved error handling
    const fetchPlants = useCallback(async () => {
        try {
            // Get all plants managed by the admin
            const response = await axios.get(`${API_URL}/api/admin/plants`);
            console.log("Plants API Response:", response.data); // Log the response for debugging

            // Add more robust error handling and response structure verification
            if (response.data) {
                // Check various possible response structures
                let plantData = [];

                if (Array.isArray(response.data)) {
                    // If response.data is directly an array
                    plantData = response.data;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    // If response.data has a data property that's an array
                    plantData = response.data.data;
                } else if (response.data.plants && Array.isArray(response.data.plants)) {
                    // Try another possible structure
                    plantData = response.data.plants;
                } else if (response.data.result && Array.isArray(response.data.result)) {
                    // One more possible structure
                    plantData = response.data.result;
                } else {
                    console.warn("Unexpected response structure:", response.data);
                    // If we can't find an array, use an empty array
                    plantData = [];
                }

                // Extract unique plant names, with better error handling
                const plantNames = plantData
                    .filter((plant) => plant && typeof plant === "object")
                    .map((plant) => {
                        // Add additional logging to debug plant data
                        console.log("Plant data:", plant);
                        // Look for name in different possible locations
                        return plant.name || plant.plantName || plant.plant || "";
                    })
                    .filter(Boolean) // Remove empty strings
                    .filter(
                        (name, index, self) =>
                            // Remove duplicates (case-insensitive)
                            index === self.findIndex((n) => normalizeString(n) === normalizeString(name)),
                    );

                console.log("Extracted plant names:", plantNames);
                setPlants(plantNames);

                if (plantNames.length === 0) {
                    console.warn("No valid plant names found in response");
                }
            } else {
                throw new Error("No data received from server");
            }
        } catch (error) {
            console.error("Error fetching plants:", error);
            setError("Failed to fetch plants: " + (error.message || "Unknown error"));

            // Set empty plants array to prevent UI issues
            setPlants([]);
        }
    }, []);

    // Enhanced fetch function for IoT data with retries and error handling
    const fetchRakeDetails = useCallback(
        async (retryCount = 0) => {
            try {
                // Prevent too frequent requests
                const now = Date.now();
                if (lastFetchTime && now - lastFetchTime < 5000) {
                    // 5 second minimum interval
                    return;
                }

                setLastFetchTime(now);

                // Try both endpoints with better error handling
                let response;
                let errorDetails = [];

                try {
                    console.log("Trying admin rake details endpoint...");
                    response = await axios.get(`${API_URL}`);
                    
                    console.log("Admin endpoint succeeded");
                } catch (adminError) {
                    errorDetails.push({
                        endpoint: "admin/rakeDetails",
                        status: adminError.response?.status,
                        message: adminError.message
                    });
                    
                    console.log("Admin endpoint failed, trying alternative endpoint:", adminError);
                    
                    try {
                        console.log("Trying rake detail endpoint...");
                        response = await axios.get(`${API_URL}`);
                        console.log("Rake detail endpoint succeeded");
                    } catch (rakeError) {
                        errorDetails.push({
                            endpoint: "rakeDetail/rakeDetails",
                            status: rakeError.response?.status,
                            message: rakeError.message
                        });
                        
                        // Both endpoints failed, throw a comprehensive error
                        throw {
                            message: "Both API endpoints failed",
                            details: errorDetails,
                            response: rakeError.response
                        };
                    }
                }

                console.log("IoT Details API Response:", response.data);
                setError(null);

                if (!response.data) {
                    throw new Error("No data received from server");
                }

                let iotData = [];

                if (Array.isArray(response.data)) {
                    iotData = response.data;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    // Handle the nested structure returned by getUserRakeDetails
                    if (response.data.data[0] && response.data.data[0].rakeDetails) {
                        iotData = response.data.data.flatMap(item => item.rakeDetails);
                    } else {
                        iotData = response.data.data;
                    }
                } else if (response.data.rakes && Array.isArray(response.data.rakes)) {
                    iotData = response.data.rakes;
                } else if (response.data.rakeDetails && Array.isArray(response.data.rakeDetails)) {
                    iotData = response.data.rakeDetails;
                } else {
                    console.warn("Unexpected response structure:", response.data);
                    iotData = [];
                }

                // Create a debug object to track what's happening
                const debug = {
                    totalEntriesReceived: iotData.length,
                    plantsProcessed: 0,
                    appliedPlantFilter: appliedFilters.plant,
                    normalizedPlantFilter: normalizeString(appliedFilters.plant),
                    plantsMatchingSelection: 0,
                    totalIotRakesFound: 0,
                };

                // Process IOT data - using the applied filter instead of selectedPlant
                const processedIotData = iotData
                    
                debug.totalIotRakesFound = processedIotData.length;
                
                // Set debug info for troubleshooting
                console.log("Filtering debug info:", debug);
                const processedRackData = processRackData(processedIotData);
                console.log("Processed rack data:", processedRackData); 
                
                // Sort all rake details by dateTime (most recent first)
                processedRackData.sort((a, b) => b.dateTime - a.dateTime);
                setRakeDetails(processedRackData);

                console.log(`Total IoT rake details after processing: ${processedRackData.length}`);
            } catch (error) {
                console.error("Error fetching IoT details:", error);
                setError(error.message || "Unknown error occurred");

                // Implement retry logic
                if (retryCount < MAX_RETRIES) {
                    setTimeout(
                        () => {
                            fetchRakeDetails(retryCount + 1);
                        },
                        RETRY_DELAY * (retryCount + 1),
                    );
                }
            } finally {
                setLoading(false);
            }
        },
        [appliedFilters.plant, lastFetchTime],
    );

     const processRackData = (rawData) => {
        console.log("Raw data for rack processing:", rawData); // Log raw data for debugging
        
        const rackStatusCounts = rawData.map((rack) => {
            let leftCount = 0;
            let rightCount = 0;

            // Count left and right bulging wagons
            rack.wagons.forEach((wagon) => {
                const status = wagon.status.toLowerCase();
                if (status === "l") {
                    leftCount++;
                } else if (status === "r") {
                    rightCount++;
                }
            });

            const totalBulging = leftCount + rightCount;

            // Extract timestamp from the first wagon and create proper date/time
            const firstTimestamp = rack.wagons[0]?.timestamp;
            let dateTime = new Date();
            let date = "";
            let time = "";

            if (firstTimestamp) {
                dateTime = new Date(firstTimestamp);
                if (isValid(dateTime)) {
                    // Format date as YYYY-MM-DD
                    date = dateTime.toISOString().split('T')[0];
                    // Format time as HH:MM AM/PM
                    time = dateTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                    });
                } else {
                    console.warn("Invalid timestamp for rack:", rack.rackId, firstTimestamp);
                    dateTime = new Date(); // fallback to current time
                    date = dateTime.toISOString().split('T')[0];
                    time = dateTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                    });
                }
            }

            return {
                _id: rack.rackId || Math.random().toString(), // Ensure unique ID
                rakeNo: rack.rackId,
                rackId: rack.rackId,
                plant: rack.plant || "N/A", // Add plant if available
                date: date,
                time: time,
                dateTime: dateTime,
                totalWagons: rack.totalWagons || rack.wagons.length,
                wagons: rack.totalWagons || rack.wagons.length,
                bulgingWagons: totalBulging,
                leftBulging: leftCount,
                left: leftCount,
                rightBulging: rightCount,
                right: rightCount,
                rawWagons: rack.wagons, // Keep original wagon data for reference
            };
        });

        console.log("Processed rack data:", rackStatusCounts);
        return rackStatusCounts;
    };
    // Initial fetch for plants and rake details
    useEffect(() => {
        // Check if user is authenticated
        if (!getToken()) {
            navigate("/login");
            return;
        }

        fetchPlants();
        fetchRakeDetails();
    }, [fetchPlants, fetchRakeDetails, navigate]);

    // Refetch rake details when applied filters change
    useEffect(() => {
        console.log("Applied filters changed to:", appliedFilters);
        fetchRakeDetails();
    }, [appliedFilters, fetchRakeDetails]);

    // Polling setup with error handling
    useEffect(() => {
        let pollInterval;

        if (!error) {
            pollInterval = setInterval(() => {
                fetchRakeDetails();
            }, POLL_INTERVAL);
        }

        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [fetchRakeDetails, error]);

    // Safe filter function - using applied filters instead of selectedPlant and sortOption
    const safeFilter = useCallback(
        (rake) => {
            try {
                // First, filter by search query
                if (searchQuery) {
                    const lowercasedQuery = searchQuery.toLowerCase();
                    const matchesSearch =
                        (rake.rakeNo?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
                            rake.plant?.toString()?.toLowerCase()?.includes(lowercasedQuery)) ??
                        false;

                    if (!matchesSearch) return false;
                }

                // Then apply date filters
                if (appliedFilters.filter === "allData") {
                    // For "allData", return everything that made it past the search query filter
                    return true;
                }

                const today = new Date();

                if (!isValid(rake.dateTime)) {
                    console.log("Invalid date for rake:", rake);
                    return false;
                }

                switch (appliedFilters.filter) {
                    case "today":
                        return isWithinInterval(rake.dateTime, {
                            start: startOfDay(today),
                            end: endOfDay(today),
                        });
                    case "yesterday": {
                        const yesterday = subDays(today, 1);
                        return isWithinInterval(rake.dateTime, {
                            start: startOfDay(yesterday),
                            end: endOfDay(yesterday),
                        });
                    }
                    case "thisWeek":
                        return isWithinInterval(rake.dateTime, {
                            start: startOfWeek(today),
                            end: endOfWeek(today),
                        });
                    case "thisMonth":
                        return isWithinInterval(rake.dateTime, {
                            start: startOfMonth(today),
                            end: endOfMonth(today),
                        });
                    case "custom":
                        if (customStartDate && customEndDate) {
                            const start = startOfDay(new Date(customStartDate));
                            const end = endOfDay(new Date(customEndDate));
                            return isValid(start) && isValid(end) && isWithinInterval(rake.dateTime, { start, end });
                        }
                        return true;
                    default:
                        return true;
                }
            } catch (error) {
                console.error("Error filtering rake:", error);
                return false;
            }
        },
        [searchQuery, customStartDate, customEndDate, appliedFilters.filter],
    );

    const filteredIotDetails = rakeDetails.filter(safeFilter);

    // Safe download function
    const downloadReport = useCallback(() => {
        try {
            const workbook = XLSX.utils.book_new();
            const exportData = filteredIotDetails.map((iotDetail) => ({
                Plant: iotDetail.plant || "N/A",
                "Rake No": iotDetail.rakeNo || iotDetail.rackId || "N/A",
                "Arrival Date": iotDetail.date || "N/A",
                "Check In Time": iotDetail.time || "N/A",
                "Total Wagons": iotDetail.totalWagons || iotDetail.wagons || 0,
                "Bulging Wagons": iotDetail.bulgingWagons || 0,
                "Right Bulging": iotDetail.rightBulging || iotDetail.right || 0,
                "Left Bulging": iotDetail.leftBulging || iotDetail.left || 0,
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "IoT Data");
            XLSX.writeFile(workbook, `iot_report_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Error downloading report:", error);
            alert("Failed to download report. Please try again.");
        }
    }, [filteredIotDetails]);

    // Apply filters function - to be called when the filter button is clicked
    const applyFilters = () => {
        setAppliedFilters({
            plant: selectedPlant,
            filter: sortOption,
        });
        console.log("Applying filters:", { plant: selectedPlant, filter: sortOption });
    };

    return (
        <div className="home-container">
            <div className="dashboard-header">
                <h2>IoT Dashboard</h2>
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
                            <th>Rake No</th>
                            <th>Arrival Date</th>
                            <th>Check In Time</th>
                            <th>Total Wagons</th>
                            <th>Bulging Wagons</th>
                            <th>Right Bulging</th>
                            <th>Left Bulging</th>
                        </tr>
                    </thead>
                    {loading ? (
                        <tbody>
                            <tr>
                                <td colSpan="8" className="loading-message">
                                    Loading...
                                </td>
                            </tr>
                        </tbody>
                    ) : filteredIotDetails.length === 0 ? (
                        <tbody>
                            <tr>
                                <td colSpan="8" className="no-data-message">
                                    {error ? "Error loading data" : "No data found for the selected filters"}
                                </td>
                            </tr>
                        </tbody>
                    ) : (

                        <tbody>
                            {console.log("Filtered IoT Details:", filteredIotDetails)}
                            {filteredIotDetails.map((iotDetail) => (
                                <tr key={iotDetail._id || Math.random().toString()}>
                                    <td>{iotDetail.plant || "N/A"}</td>
                                    <td>{iotDetail.rakeNo || iotDetail.rackId || "N/A"}</td>
                                    <td>{iotDetail.date || "N/A"}</td>
                                    <td>{iotDetail.time || "N/A"}</td>
                                    <td>{iotDetail.totalWagons || iotDetail.wagons || 0}</td>
                                    <td>{iotDetail.bulgingWagons || 0}</td>
                                    <td>{iotDetail.rightBulging || iotDetail.right || 0}</td>
                                    <td>{iotDetail.leftBulging || iotDetail.left || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>
        </div>
    );
};

export default IotDash;