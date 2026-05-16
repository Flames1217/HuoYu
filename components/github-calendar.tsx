"use client"

import { useEffect, useState, useRef, memo } from "react"
import { useLocaleText } from "@/lib/use-locale-text"
import { useTheme } from "next-themes"
import ReactGitHubCalendar from "react-github-calendar"
import React from "react"

interface ContributionDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4 // Reverted to original type
  title?: string
}

// 使用memo优化组件，避免不必要的重新渲染
export const GitHubCalendar = memo(function GitHubCalendar() {
  const { theme } = useTheme()
  const { t, i18n } = useLocaleText()
  // Initialize username as empty or undefined, and add loading state
  const [username, setUsername] = useState<string | undefined>(undefined) 
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    const fetchGithubUsername = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/profile-public');
        if (!response.ok) {
          throw new Error('Failed to fetch profile data for GitHub username');
        }
        const data = await response.json();
        if (data.githubUsername) {
          setUsername(data.githubUsername);
        } else {
          console.warn("GitHub username not found in profile data. Displaying missing message.");
          // Username remains undefined, leading to the "usernameMissing" message
        }
      } catch (error) {
        console.error("Error fetching GitHub username:", error);
        // Username remains undefined
      } finally {
        setIsLoading(false);
      }
    };

    fetchGithubUsername();
  }, []) // Empty dependency array, runs once

  if (!isClient || isLoading) { // Show loading/placeholder
    return (
      <div className="h-40 w-full bg-muted rounded-md animate-pulse">
        {/* Placeholder */}
      </div>
    )
  }
  
  // username must be provided for the calendar to work.
  if (!username) {
    return <p className="text-sm text-muted-foreground">{t("github.usernameMissing")}</p>
  }

  // Original transformData function - keep it for now, but we won't pass it directly
  const originalTransformData = (data: Array<ContributionDay>): Array<ContributionDay> => {
    return data.map((day, index) => {
      let localizedDate = '';
      try {
        localizedDate = new Date(day.date).toLocaleDateString(
          i18n.language, 
          { year: 'numeric', month: 'long', day: 'numeric' }
        );
      } catch (e) {
        console.error("Error formatting date:", day.date, e);
        localizedDate = day.date; // Fallback to original date string
      }

      let tooltipText = '';
      try {
        tooltipText = t('github.contributionTooltip', { count: day.count, date: localizedDate });
      } catch (e) {
        console.error("Error getting translation for tooltip:", e);
        // Fallback tooltip text
        tooltipText = `${day.count} contributions on ${localizedDate}`;
      }
      
      const transformedDay = {
        ...day,
        title: tooltipText,
      };
      if (index < 5) { // Log first 5 transformed days to check title content
      }
      return transformedDay;
    });
  };

  // Function to render each block with a tooltip
  // Use a more generic type for activity parameter from renderBlock
  const renderBlockWithTooltip = (block: React.ReactElement, activity: any) => {
    // We expect activity.title to exist if originalTransformData worked correctly.
    // The activity object here comes from the library, its level might be just number.
    const tooltipTitle = (activity as ContributionDay).title;

    if (tooltipTitle) {
      return React.cloneElement(
        block,
        {},
        <title>{tooltipTitle}</title>
      );
    }
    return block;
  };

  return (
    <div className={`github-calendar-wrapper ${theme} w-full overflow-hidden p-4 rounded-lg bg-white/[.30] dark:bg-black/[.30]`}>
      <ReactGitHubCalendar
        username={username}
        blockSize={14}
        blockMargin={4}
        fontSize={12}
        labels={{
          totalCount: `{{count}} ${t("github.contributionsInLastYear")}`,
        }}
        transformData={originalTransformData}
        renderBlock={renderBlockWithTooltip}
        showWeekdayLabels
      />
      {/* CSS-in-JS for theme-specific styling overrides */}
      {/* These styles target the SVG elements rendered by react-github-calendar */}
      <style jsx global>{`
        /* General style for the calendar text (month names, day numbers, total count) */
        .react-activity-calendar__count,
        .react-activity-calendar__legend-month text,
        .react-activity-calendar__legend-weekday text {
           /* Default dark theme text color (can be overridden by specific light theme rules) */
          fill: var(--color-calendar-graph-text, #CDCDCD);
        }

        /* Light theme overrides */
        html.light .github-calendar-wrapper .react-activity-calendar__count,
        html.light .github-calendar-wrapper .react-activity-calendar__legend-month text,
        html.light .github-calendar-wrapper .react-activity-calendar__legend-weekday text {
          fill: var(--color-calendar-graph-text-light, #24292f) !important; /* GitHub's light theme text color */
        }

        /* Contribution block colors - using GitHub's color scheme as a base */
        /* Light Theme Colors */
        html.light .github-calendar-wrapper rect.ContributionCalendar-day[data-level="0"] {
          fill: var(--color-calendar-graph-day-bg-light, #ebedf0) !important;
        }
        html.light .github-calendar-wrapper rect.ContributionCalendar-day[data-level="1"] {
          fill: var(--color-calendar-graph-day-L1-bg-light, #9be9a8) !important;
        }
        html.light .github-calendar-wrapper rect.ContributionCalendar-day[data-level="2"] {
          fill: var(--color-calendar-graph-day-L2-bg-light, #40c463) !important;
        }
        html.light .github-calendar-wrapper rect.ContributionCalendar-day[data-level="3"] {
          fill: var(--color-calendar-graph-day-L3-bg-light, #30a14e) !important;
        }
        html.light .github-calendar-wrapper rect.ContributionCalendar-day[data-level="4"] {
          fill: var(--color-calendar-graph-day-L4-bg-light, #216e39) !important;
        }

        /* Dark Theme Colors (overrides if library defaults are not sufficient) */
        html.dark .github-calendar-wrapper rect.ContributionCalendar-day[data-level="0"] {
          fill: var(--color-calendar-graph-day-bg-dark, #161b22) !important;
        }
        html.dark .github-calendar-wrapper rect.ContributionCalendar-day[data-level="1"] {
          fill: var(--color-calendar-graph-day-L1-bg-dark, #0e4429) !important;
        }
        html.dark .github-calendar-wrapper rect.ContributionCalendar-day[data-level="2"] {
          fill: var(--color-calendar-graph-day-L2-bg-dark, #006d32) !important;
        }
        html.dark .github-calendar-wrapper rect.ContributionCalendar-day[data-level="3"] {
          fill: var(--color-calendar-graph-day-L3-bg-dark, #26a641) !important;
        }
        html.dark .github-calendar-wrapper rect.ContributionCalendar-day[data-level="4"] {
          fill: var(--color-calendar-graph-day-L4-bg-dark, #39d353) !important;
        }

        /* Ensure the calendar itself takes available width and centers if smaller */
        .react-activity-calendar {
          margin: 0 auto; /* Center the calendar if its intrinsic width is less than container */
        }
      `}</style>
    </div>
  )
})
