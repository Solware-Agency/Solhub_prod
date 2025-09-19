import React, { useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@shared/lib/cn'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxTags?: number
  allowDuplicates?: boolean
  id?: string
}

export const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = "Escribir y presionar Enter...",
  className,
  disabled = false,
  maxTags,
  allowDuplicates = false,
  id,
}) => {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toUpperCase()
    if (!trimmedTag) return

    // Check for duplicates if not allowed
    if (!allowDuplicates && value.includes(trimmedTag)) {
      setInputValue('')
      return
    }

    // Check max tags limit
    if (maxTags && value.length >= maxTags) {
      setInputValue('')
      return
    }

    const newTags = [...value, trimmedTag]
    onChange(newTags)
    setInputValue('')
  }

  const removeTag = (indexToRemove: number) => {
    const newTags = value.filter((_, index) => index !== indexToRemove)
    onChange(newTags)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      removeTag(value.length - 1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-[40px] w-full flex-wrap gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-none",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={handleContainerClick}
    >
      {/* Render existing tags */}
      {value.map((tag, index) => (
        <div
          key={index}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
        >
          <span>{tag}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(index)
              }}
              className="ml-1 rounded-full p-0.5 hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {/* Input field */}
      {!disabled && (!maxTags || value.length < maxTags) && (
        <div className="flex flex-1 items-center">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            disabled={disabled}
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="ml-2 rounded-full p-1 hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <Plus className="h-3 w-3 text-primary" />
            </button>
          )}
        </div>
      )}

      {/* Show max tags indicator */}
      {maxTags && value.length >= maxTags && (
        <div className="flex items-center text-xs text-muted-foreground">
          Máximo {maxTags} etiquetas
        </div>
      )}
    </div>
  )
}

export default TagInput