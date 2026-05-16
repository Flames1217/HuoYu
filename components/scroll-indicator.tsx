"use client"

import { useEffect, useState } from "react"
// import { ChevronDown } from "lucide-react"
import { FiChevronDown } from "react-icons/fi"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ScrollIndicator() {
  const [showScroll, setShowScroll] = useState(false)

  const checkScrollTop = () => {
    if (!showScroll && window.pageYOffset > 200) {
      setShowScroll(true)
    } else if (showScroll && window.pageYOffset <= 200) {
      setShowScroll(false)
    }
  }

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    window.addEventListener("scroll", checkScrollTop)
    return () => window.removeEventListener("scroll", checkScrollTop)
  }, [showScroll])

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-opacity duration-300",
        showScroll ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={scrollTop}
    >
      {/* <ChevronDown className="h-4 w-4 rotate-180" /> */}
      <FiChevronDown className="h-4 w-4 rotate-180" />
      <span className="sr-only">Scroll to top</span>
    </Button>
  )
}
