'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'

interface LocationPickerProps {
  value: string
  onChange: (location: string) => void
  placeholder?: string
}

interface Suggestion {
  description: string
  place_id: string
}

export default function LocationPicker({ value, onChange, placeholder = 'Buscar ubicación...' }: LocationPickerProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const serviceRef = useRef<any>(null)

  useEffect(() => {
    if (window.google?.maps?.places) {
      serviceRef.current = new window.google.maps.places.AutocompleteService()
    }
  }, [])

  const handleInputChange = async (text: string) => {
    onChange(text)
    
    if (!text.trim() || !serviceRef.current) {
      setSuggestions([])
      return
    }

    try {
      const result = await serviceRef.current.getPlacePredictions({
        input: text,
        componentRestrictions: { country: 'es' },
      })

      setSuggestions(result.predictions || [])
      setShowSuggestions(true)
    } catch (err) {
      console.error('Error fetching suggestions:', err)
    }
  }

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.description)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleClear = () => {
    onChange('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
        <input
          type="text"
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => value && setSuggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="input pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10 p-0"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-slate-100 border-b border-slate-100 last:border-b-0 text-sm"
            >
              <div className="font-medium">{suggestion.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
