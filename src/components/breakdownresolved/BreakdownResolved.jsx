import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Filter, Download, Search, Calendar, Building, History, X } from "lucide-react";
import * as XLSX from "xlsx";
import './BreakdownResolved.css';
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

const BreakdownResolveScreen = () => {
    const navigate = useNavigate();
    const [breakdowns, setBreakdowns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [remarks, setRemarks] = useState({});
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState("today");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [plants, setPlants] = useState([]);
    const [selectedPlant, setSelectedPlant] = useState("All");
    const [appliedFilters, setAppliedFilters] = useState({
        plant: "All",
        filter: "today",
    });
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBreakdownId, setSelectedBreakdownId] = useState(null);
    const [currentRemark, setCurrentRemark] = useState("");

    // Constants
    const POLL_INTERVAL = 10000; // 10 seconds
    const API_URL = "https://server-api-pearl.vercel.app";
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    // Get token from localStorage
    const getToken = useCallback(() => {
        return localStorage.getItem("token");
    }, []);

    // Config with authorization header
    const getAuthConfig = useCallback(() => {
        const token = getToken();
        return {
            headers: {
                Authorization: `Bearer ${token}`,
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
            },
            timeout: 10000, // 10 second timeout
        };
    }, [getToken]);

    // Helper function to normalize strings for comparison
    const normalizeString = (str) => {
        return str ? str.trim().toLowerCase() : "";
    };

    // Fetch plants
    const fetchPlants = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/plants`, getAuthConfig());
            console.log("Plants API Response:", response.data);

            let plantData = [];
            if (Array.isArray(response.data)) {
                plantData = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
                plantData = response.data.data;
            } else if (response.data.plants && Array.isArray(response.data.plants)) {
                plantData = response.data.plants;
            } else if (response.data.result && Array.isArray(response.data.result)) {
                plantData = response.data.result;
            } else {
                console.warn("Unexpected response structure:", response.data);
                plantData = [];
            }

            const plantNames = plantData
                .filter((plant) => plant && typeof plant === "object")
                .map((plant) => {
                    return plant.name || plant.plantName || plant.plant || "";
                })
                .filter(Boolean)
                .filter(
                    (name, index, self) =>
                        index === self.findIndex((n) => normalizeString(n) === normalizeString(name)),
                );

            console.log("Extracted plant names:", plantNames);
            setPlants(plantNames);
        } catch (error) {
            console.error("Error fetching plants:", error);
            setError("Failed to fetch plants: " + (error.message || "Unknown error"));
            setPlants([]);
        }
    }, [getAuthConfig, API_URL]);

    // Fetch unresolved breakdowns with retries and filtering
    const fetchBreakdowns = useCallback(async (retryCount = 0) => {
        try {
            // Prevent too frequent requests
            const now = Date.now();
            if (lastFetchTime && now - lastFetchTime < 5000) {
                return;
            }

            setLastFetchTime(now);
            const response = await axios.get(`${API_URL}/api/rakeDetail/getUnresolvedBreakdowns`, getAuthConfig());
            console.log("Breakdowns API Response:", response.data);

            if (!response.data || !response.data.breakdowns) {
                throw new Error("No data received from server");
            }

            // Process breakdowns and add dateTime property
            const processedBreakdowns = response.data.breakdowns.map(breakdown => {
                // Parse the breakdown time to a Date object
                const dateTime = new Date(breakdown.breakdownTime);
                // Add plant information if available
                return {
                    ...breakdown,
                    dateTime: isValid(dateTime) ? dateTime : new Date(),
                    plant: breakdown.plant || "N/A"
                };
            });

            setBreakdowns(processedBreakdowns);
            setError(null);
        } catch (error) {
            console.error("Error fetching breakdowns:", error);
            setError("Failed to fetch breakdowns: " + (error.message || "Unknown error"));

            // Implement retry logic
            if (retryCount < MAX_RETRIES) {
                setTimeout(
                    () => {
                        fetchBreakdowns(retryCount + 1);
                    },
                    RETRY_DELAY * (retryCount + 1)
                );
            }
        } finally {
            setLoading(false);
        }
    }, [lastFetchTime, API_URL, getAuthConfig]);

    // Initial fetch
    useEffect(() => {
        // Check if user is authenticated
        if (!getToken()) {
            navigate("/login");
            return;
        }

        fetchPlants();
        fetchBreakdowns();
    }, [fetchPlants, fetchBreakdowns, navigate, getToken]);

    // Refetch when applied filters change
    useEffect(() => {
        console.log("Applied filters changed to:", appliedFilters);
        fetchBreakdowns();
    }, [appliedFilters, fetchBreakdowns]);

    // Polling setup with error handling
    useEffect(() => {
        let pollInterval;

        if (!error) {
            pollInterval = setInterval(() => {
                fetchBreakdowns();
            }, POLL_INTERVAL);
        }

        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [fetchBreakdowns, error]);

    // Open modal with breakdown ID
    const openResolveModal = (breakdownId) => {
        setSelectedBreakdownId(breakdownId);
        setCurrentRemark(remarks[breakdownId] || "");
        setIsModalOpen(true);
    };

    // Close modal
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedBreakdownId(null);
        setCurrentRemark("");
    };

    // Handle remark input in modal
    const handleRemarkChange = (e) => {
        setCurrentRemark(e.target.value);
    };

    // Resolve breakdown function
    const resolveBreakdown = async () => {
        if (!currentRemark.trim()) {
            alert("Please enter a remark before resolving.");
            return;
        }

        try {
            await axios.patch(`${API_URL}/api/rakeDetail/resolveBreakdown/${selectedBreakdownId}`, {
                remark: currentRemark,
            }, getAuthConfig());

            alert("Breakdown resolved successfully!");
            setBreakdowns(breakdowns.filter((b) => b._id !== selectedBreakdownId));
            setRemarks((prev) => {
                const updatedRemarks = { ...prev };
                delete updatedRemarks[selectedBreakdownId];
                return updatedRemarks;
            });
            closeModal();
        } catch (error) {
            console.error("Error resolving breakdown:", error);
            alert("Failed to resolve breakdown");
        }
    };

    // Safe filter function for breakdowns
    const safeFilterBreakdowns = useCallback(
        (breakdown) => {
            try {
                // First, filter by plant
                if (appliedFilters.plant !== "All") {
                    const normalizedBreakdownPlant = normalizeString(breakdown.plant);
                    const normalizedSelectedPlant = normalizeString(appliedFilters.plant);
                    if (normalizedBreakdownPlant !== normalizedSelectedPlant) {
                        return false;
                    }
                }

                // Then, filter by search query
                if (searchQuery) {
                    const lowercasedQuery = searchQuery.toLowerCase();
                    const matchesSearch = 
                        (breakdown.wagonKey?.toString()?.toLowerCase()?.includes(lowercasedQuery) ||
                        breakdown.reasons?.some(reason => reason.toLowerCase().includes(lowercasedQuery)) ||
                        breakdown.plant?.toString()?.toLowerCase()?.includes(lowercasedQuery)) ?? 
                        false;

                    if (!matchesSearch) return false;
                }

                // Then apply date filters
                if (appliedFilters.filter === "allData") {
                    return true;
                }

                const today = new Date();

                if (!isValid(breakdown.dateTime)) {
                    console.log("Invalid date for breakdown:", breakdown);
                    return false;
                }

                switch (appliedFilters.filter) {
                    case "today":
                        return isWithinInterval(breakdown.dateTime, {
                            start: startOfDay(today),
                            end: endOfDay(today),
                        });
                    case "yesterday": {
                        const yesterday = subDays(today, 1);
                        return isWithinInterval(breakdown.dateTime, {
                            start: startOfDay(yesterday),
                            end: endOfDay(yesterday),
                        });
                    }
                    case "thisWeek":
                        return isWithinInterval(breakdown.dateTime, {
                            start: startOfWeek(today),
                            end: endOfWeek(today),
                        });
                    case "thisMonth":
                        return isWithinInterval(breakdown.dateTime, {
                            start: startOfMonth(today),
                            end: endOfMonth(today),
                        });
                    case "custom":
                        if (customStartDate && customEndDate) {
                            const start = startOfDay(new Date(customStartDate));
                            const end = endOfDay(new Date(customEndDate));
                            return isValid(start) && isValid(end) && isWithinInterval(breakdown.dateTime, { start, end });
                        }
                        return true;
                    default:
                        return true;
                }
            } catch (error) {
                console.error("Error filtering breakdown:", error);
                return false;
            }
        },
        [searchQuery, customStartDate, customEndDate, appliedFilters]
    );

    // Filter breakdowns based on all criteria
    const filteredBreakdowns = breakdowns.filter(safeFilterBreakdowns);

    // Download report function
    const downloadReport = useCallback(() => {
        try {
            const workbook = XLSX.utils.book_new();
            const exportData = filteredBreakdowns.map((breakdown) => ({
                "Wagon Key": breakdown.wagonKey || "N/A",
                "Reasons": breakdown.reasons?.join(", ") || "N/A",
                "Breakdown Time": new Date(breakdown.breakdownTime).toLocaleString() || "N/A",
                "Plant": breakdown.plant || "N/A",
                "Status": "Unresolved"
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "Unresolved Breakdowns");
            XLSX.writeFile(workbook, `unresolved_breakdowns_report_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Error downloading report:", error);
            alert("Failed to download report. Please try again.");
        }
    }, [filteredBreakdowns]);

    // Apply filters function
    const applyFilters = () => {
        setAppliedFilters({
            plant: selectedPlant,
            filter: sortOption,
        });
        console.log("Applying filters:", { plant: selectedPlant, filter: sortOption });
    };

    return (
        <div className="unresolved-breakdown-container">
            <div className="dashboard-header">
                <h2>Unresolved Breakdown Dashboard</h2>
                {error && <div className="error-message">Error: {error}. Retrying...</div>}

                <div className="filter-controls">
                    {/* Search Input */}
                    <div className="search-container">
                        <div className="input-with-icon">
                            <Search className="input-icon" size={18} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by Wagon Key"
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
                    <button className="history-btn" onClick={() => navigate("/breakdownHistory")}>
                        <History size={16} />
                        Breakdown History
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
                            <th>Wagon Key</th>
                            <th>Reasons</th>
                            {/* <th>Breakdown Time</th> */}
                            <th>Action</th>
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
                    ) : filteredBreakdowns.length === 0 ? (
                        <tbody>
                            <tr>
                                <td colSpan="4" className="no-data-message">
                                    {error ? "Error loading data" : "No unresolved breakdowns found for the selected filters"}
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody>
                            {filteredBreakdowns.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.wagonKey || "N/A"}</td>
                                    <td>{item.reasons.join(", ") || "N/A"}</td>
                                    {/* <td>{new Date(item.breakdownTime).toLocaleString() || "N/A"}</td> */}
                                    <td>
                                        <button 
                                            className="resolve-btn"
                                            onClick={() => openResolveModal(item._id)}
                                        >
                                            Resolve
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>

            {/* Modal Popup */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3>Resolve Breakdown</h3>
                            <button className="modal-close-btn" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-content">
                            <div className="modal-form-group">
                                <label htmlFor="remarks">Enter Remarks</label>
                                <textarea
                                    id="remarks"
                                    className="modal-input"
                                    placeholder="Enter your remarks here..."
                                    value={currentRemark}
                                    onChange={handleRemarkChange}
                                    rows={4}
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button className="modal-done-btn" onClick={resolveBreakdown}>
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BreakdownResolveScreen;