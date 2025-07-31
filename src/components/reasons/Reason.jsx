import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { Filter, Download, Search, Calendar } from "lucide-react";
import "./Reason.css";
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

const Reason = () => {
  const navigate = useNavigate();
  const [rakeDetails, setRakeDetails] = useState([]);
  const [reasonCounts, setReasonCounts] = useState({});
  const [maxCountReason, setMaxCountReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({
    filter: "today",
  });

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

  // Enhanced time conversion with validation
  const convertTo24HourFormat = useCallback((time) => {
    if (!time || typeof time !== "string") {
      return "00:00";
    }

    try {
      const [hourMin, period] = time.trim().split(" ");
      if (!hourMin || !period) return "00:00";

      const [hour, minute] = hourMin.split(":").map((num) => {
        const parsed = Number.parseInt(num, 10);
        return isNaN(parsed) ? 0 : parsed;
      });

      const validHour = Math.min(Math.max(hour, 0), 23);
      const validMinute = Math.min(Math.max(minute, 0), 59);
      const adjustedHour = period.toLowerCase() === "pm" && validHour !== 12 ? validHour + 12 : validHour;

      return `${adjustedHour.toString().padStart(2, "0")}:${validMinute.toString().padStart(2, "0")}`;
    } catch (error) {
      console.error("Error converting time format:", error);
      return "00:00";
    }
  }, []);

  // Function to safely parse date
  const parseSafeDate = useCallback(
    (dateStr, timeStr) => {
      try {
        const time24hr = convertTo24HourFormat(timeStr);
        const combinedDateTime = `${dateStr} ${time24hr}`;
        const dateTime = new Date(combinedDateTime);
        return isValid(dateTime) ? dateTime : new Date();
      } catch (error) {
        console.error("Error parsing date:", error);
        return new Date();
      }
    },
    [convertTo24HourFormat]
  );

  // Safe filter function for rake details - MOVED BEFORE IT'S USED
  const safeFilterRakeDetails = useCallback(
    (rake) => {
      try {
        if (!rake.dateTime || !isValid(rake.dateTime)) {
          return false;
        }

        if (appliedFilters.filter === "allData") {
          return true;
        }

        const today = new Date();

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
    [appliedFilters.filter, customStartDate, customEndDate]
  );

  // Extract reason counts from rake details
  const extractReasonCounts = useCallback((rakeDetails) => {
    let counts = {};
    let maxReason = ["", 0];

    // Filter rake details based on date criteria
    const filteredRakeDetails = rakeDetails.filter(safeFilterRakeDetails);

    filteredRakeDetails.forEach((item) => {
      if (item.wagonShiftingDetails && Array.isArray(item.wagonShiftingDetails)) {
        item.wagonShiftingDetails.forEach((detail) => {
          if (detail.reason && detail.reason !== "") {
            counts[detail.reason] = (counts[detail.reason] || 0) + 1;

            if (counts[detail.reason] > maxReason[1]) {
              maxReason = [detail.reason, counts[detail.reason]];
            }
          }
        });
      }
    });

    setReasonCounts(counts);
    setMaxCountReason(maxReason[0]);
  }, [safeFilterRakeDetails]);

  // Enhanced fetch function with retries
  const fetchRakeDetails = useCallback(
    async (retryCount = 0) => {
      try {
        const now = Date.now();
        if (lastFetchTime && now - lastFetchTime < 5000) {
          return;
        }

        setLoading(true);
        const response = await axios.get(`${API_URL}/api/admin/plants`, getAuthConfig());
        console.log("Rake Details API Response:", response.data);

        setLastFetchTime(now);
        setError(null);

        if (!response.data) {
          throw new Error("No data received from server");
        }

        let plantsData = [];
        if (Array.isArray(response.data)) {
          plantsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          plantsData = response.data.data;
        } else if (response.data.plants && Array.isArray(response.data.plants)) {
          plantsData = response.data.plants;
        } else if (response.data.result && Array.isArray(response.data.result)) {
          plantsData = response.data.result;
        } else {
          console.warn("Unexpected response structure:", response.data);
          plantsData = [];
        }

        // Extract all rake details
        let allRakeDetails = [];
        plantsData.forEach((plant) => {
          if (!plant || typeof plant !== "object") {
            return;
          }

          const plantName = plant.name || plant.plantName || plant.plant || "";

          if (plant.rakeDetails && Array.isArray(plant.rakeDetails)) {
            const plantRakeDetails = plant.rakeDetails
              .filter((item) => item && typeof item === "object")
              .map((item) => {
                try {
                  const dateTime = parseSafeDate(item.date, item.time);

                  const wagonShiftingDetails = item.wagonShifting
                    ? Object.keys(item.wagonShifting).map((key) => ({
                      key,
                      rakeNo: item.rakeNo,
                      plant: plantName,
                      dateTime,
                      ...item.wagonShifting[key],
                    }))
                    : [];

                  return {
                    ...item,
                    plant: plantName,
                    plantId: plant._id || "",
                    dateTime,
                    wagonShiftingDetails,
                  };
                } catch (error) {
                  console.error("Error processing rake item:", error);
                  return null;
                }
              })
              .filter(Boolean);

            allRakeDetails = [...allRakeDetails, ...plantRakeDetails];
          }
        });

        allRakeDetails.sort((a, b) => b.dateTime - a.dateTime);
        setRakeDetails(allRakeDetails);
        extractReasonCounts(allRakeDetails);

        console.log(`Total rake details after processing: ${allRakeDetails.length}`);
      } catch (error) {
        console.error("Error fetching rake details:", error);
        setError(error.message || "Unknown error occurred");

        if (retryCount < MAX_RETRIES) {
          setTimeout(
            () => {
              fetchRakeDetails(retryCount + 1);
            },
            RETRY_DELAY * (retryCount + 1)
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [lastFetchTime, getAuthConfig, parseSafeDate, extractReasonCounts]
  );

  // Filter reasons based on search
  const getFilteredReasons = useCallback(() => {
    return Object.entries(reasonCounts)
      .filter(([reason]) => reason.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b[1] - a[1]); // Sort by count, descending
  }, [reasonCounts, searchQuery]);

  // Initial fetch when component mounts
  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    fetchRakeDetails();
  }, [fetchRakeDetails, navigate, getToken]);

  // Refetch when applied filters change
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

  // Apply filters function
  const applyFilters = () => {
    setAppliedFilters({
      filter: sortOption,
    });
    console.log("Applying filters:", { filter: sortOption });
  };

  // Safe download function

  // const downloadReport = useCallback(() => {
  //   try {
  //     const workbook = XLSX.utils.book_new();
  //     const filteredReasons = getFilteredReasons();

  //     const exportData = filteredReasons.map(([reason, count]) => ({
  //       "Defect Reason": reason,
  //       "Occurrences": count,
  //       "Most Frequent": reason === maxCountReason ? "Yes" : "No"
  //     }));

  //     const worksheet = XLSX.utils.json_to_sheet(exportData);
  //     XLSX.utils.book_append_sheet(workbook, worksheet, "Repeated Defects");
  //     XLSX.writeFile(workbook, `repeated_defects_report_${new Date().toISOString().split("T")[0]}.xlsx`);
  //   } catch (error) {
  //     console.error("Error downloading report:", error);
  //     alert("Failed to download report. Please try again.");
  //   }
  // }, [getFilteredReasons, maxCountReason]);


  const downloadReport = useCallback(() => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Get filtered defect reasons
      const filteredReasons = getFilteredReasons();

      // Create worksheet with title row and header row
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["REPEATED DEFECTS REPORT"], // Title row
        [
          "Defect Reason",
          "Occurrences",
          "Most Frequent"
        ], // Header row
      ]);

      // Add data rows
      const dataRows = filteredReasons.map(([reason, count]) => [
        reason,
        count,
        reason === maxCountReason ? "Yes" : "No"
      ]);

      // Start adding data from row 3 (after title and header)
      XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A3" });

      // Merge cells for the title
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }); // Merge all 3 columns in row 0

      // Set column widths
      worksheet['!cols'] = [
        { wch: 40 },  // Defect Reason - wider for text
        { wch: 15 },  // Occurrences
        { wch: 15 },  // Most Frequent
      ];

      // Add cell styles
      for (let i = 0; i < 3; i++) {
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

      // Highlight the "Yes" values in the "Most Frequent" column
      dataRows.forEach((row, idx) => {
        if (row[2] === "Yes") {
          const cellRef = XLSX.utils.encode_cell({ r: idx + 2, c: 2 }); // +2 because data starts at row 3
          if (worksheet[cellRef]) {
            worksheet[cellRef].s = {
              font: { bold: true, color: { rgb: "008000" } }, // Green color for "Yes"
              alignment: { horizontal: "center" }
            };
          }
        }
      });

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Repeated Defects");

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
      const fileName = `repeated_defects_report_${new Date().toISOString().split("T")[0]}.xlsx`;

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
  }, [getFilteredReasons, maxCountReason]);

  // Get filtered reasons
  const filteredReasons = getFilteredReasons();

  return (
    <div className="wagon-shifting-container">
      <div className="dashboard-header">
        <h2>Repeated Defects Dashboard</h2>
        {error && <div className="error-message">Error: {error}. Retrying...</div>}

        <div className="filter-controls">
          <div className="search-container">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder="Search Defect Reasons"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="date-filter-container">
            <div className="input-with-icon">
              <Calendar className="input-icon" size={18} />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="filter-select"
              >
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
              <th>Defect Reason</th>
              <th>Occurrences</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} className="loading-message">
                  Loading...
                </td>
              </tr>
            ) : filteredReasons.length === 0 ? (
              <tr>
                <td colSpan={2} className="no-data-message">
                  {error ? "Error loading data" : "No defect data found for the selected filters"}
                </td>
              </tr>
            ) : (
              filteredReasons.map(([reason, count]) => (
                <tr
                  key={reason}
                  className={reason === maxCountReason ? "highlighted-row" : ""}
                >
                  <td>{reason}</td>
                  <td>{count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reason;