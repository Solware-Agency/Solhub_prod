import * as React from "react";
import { Input } from "@shared/components/ui/input";
import { cn } from "@shared/lib/cn";
import { useAutocomplete } from "@shared/hooks/useAutocomplete";
import { Loader2 } from "lucide-react";

interface AutocompleteInputProps extends React.ComponentProps<typeof Input> {
  fieldName: string;
  onValueChange?: (value: string) => void;
  onPatientSelect?: (idNumber: string) => void;
  minSearchLength?: number;
  iconRight?: React.ReactNode;
  iconLeft?: React.ReactNode;
}

// Use React.memo to prevent unnecessary re-renders
export const AutocompleteInput = React.memo(React.forwardRef<
  HTMLInputElement,
  AutocompleteInputProps
>(({ className, fieldName, onValueChange, onPatientSelect, minSearchLength = 0, iconRight, iconLeft, ...props }, ref) => {
  const [inputValue, setInputValue] = React.useState(String(props.value || ""));
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [searchTerminated, setSearchTerminated] = React.useState(false);
  const [isAutofilled, setIsAutofilled] = React.useState(false);
  const [hasFocused, setHasFocused] = React.useState(false);
  const { suggestions, isLoading, getSuggestions, hasPreloadedData } = useAutocomplete(fieldName);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastSearchTermRef = React.useRef<string>('');

  // Combine refs
  React.useImperativeHandle(ref, () => inputRef.current!);

  // Sync with external value
  React.useEffect(() => {
    if (props.value !== inputValue) {
      const newValue = String(props.value || "");
      setInputValue(newValue);
      
      // If value changed externally (autofill), mark as autofilled
      if (newValue && newValue !== inputValue) {
        setIsAutofilled(true);
        setSearchTerminated(true);
        setShowSuggestions(false);
      } else if (!newValue) {
        setIsAutofilled(false);
        setSearchTerminated(false);
      }
    }
  }, [props.value, inputValue]);

  // Event listener to hide ALL suggestions when patient data is autofilled
  React.useEffect(() => {
    const handleHideAllAutocompleteSuggestions = () => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      setSearchTerminated(true);
      setIsAutofilled(true);
    };

    window.addEventListener('hideAllAutocompleteSuggestions', handleHideAllAutocompleteSuggestions);

    return () => {
      window.removeEventListener('hideAllAutocompleteSuggestions', handleHideAllAutocompleteSuggestions);
    };
  }, []);

  // Close suggestions on scroll to keep them fixed
  React.useEffect(() => {
    if (!showSuggestions) return;
    
    const handleScroll = () => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      setSearchTerminated(true);
    };
    
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showSuggestions]);

  // Debounced search effect - prevent infinite loops
  React.useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Don't search if terminated, autofilled, haven't focused, no preloaded data, or empty input
    if (searchTerminated || isAutofilled || !hasFocused || !hasPreloadedData || inputValue.length === 0) {
      setShowSuggestions(false);
      return;
    }

    // Prevent duplicate searches
    if (lastSearchTermRef.current === inputValue) {
      return;
    }

    // Update last search term
    lastSearchTermRef.current = inputValue;

    // Search with debounce for typing
    debounceTimeoutRef.current = setTimeout(() => {
      getSuggestions(inputValue);
      setShowSuggestions(true);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [inputValue, getSuggestions, searchTerminated, isAutofilled, hasFocused, hasPreloadedData]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSelectedIndex(-1);
    setSearchTerminated(false);
    setIsAutofilled(false); // Reset autofill when user types manually
    onValueChange?.(value);
    
    // Call original onChange if exists
    props.onChange?.(e);
  }, [props.onChange, onValueChange]);

  const handleSuggestionClick = React.useCallback((suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setSearchTerminated(true);
    setIsAutofilled(false); // Not autofill, manual selection
    lastSearchTermRef.current = suggestion; // Update last search term
    onValueChange?.(suggestion);
    
    // If it's ID number field, trigger patient selection silently
    if (fieldName === 'idNumber' && onPatientSelect) {
      setTimeout(() => {
				// Pass the full cedula (with prefix) to the autofill function
				onPatientSelect(suggestion)
			}, 100);
    }
    
    // Create synthetic event for compatibility
    const syntheticEvent = {
      target: { value: suggestion }
    } as React.ChangeEvent<HTMLInputElement>;
    props.onChange?.(syntheticEvent);
    
    // Focus input after selection
    inputRef.current?.focus();
  }, [fieldName, onPatientSelect, onValueChange, props.onChange]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0 || searchTerminated || isAutofilled) {
      props.onKeyDown?.(e);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex].value);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setSearchTerminated(true);
        break;
      case 'Tab':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setSearchTerminated(true);
        props.onKeyDown?.(e);
        break;
      default:
        props.onKeyDown?.(e);
    }
  }, [showSuggestions, suggestions, selectedIndex, searchTerminated, isAutofilled, props.onKeyDown, handleSuggestionClick]);

  const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
    props.onBlur?.(e);
  }, [props.onBlur]);

  const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setHasFocused(true);
    
    // Only show suggestions on focus if there's input value and not terminated/autofilled
    if (!searchTerminated && !isAutofilled && hasPreloadedData && inputValue.length > 0) {
      // Reset last search term to force new search
      lastSearchTermRef.current = '';
      
      // Trigger search for suggestions only if there's input
      setTimeout(() => {
        getSuggestions(inputValue);
        setShowSuggestions(true);
      }, 0);
    }
    props.onFocus?.(e);
  }, [getSuggestions, hasPreloadedData, inputValue, isAutofilled, props.onFocus, searchTerminated]);

  // Determine the icon based on field and state - memoized to prevent unnecessary recalculations
  const getIcon = React.useMemo(() => {
    if (isLoading && !searchTerminated && !isAutofilled) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    return null;
  }, [isLoading, searchTerminated, isAutofilled, fieldName, showSuggestions, inputValue, hasFocused]);



  return (
    <div className="relative">
      <div className="relative">
        <Input
          {...props}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={cn(className)}
          autoComplete="off"
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {iconRight}
          </div>
        )}
        {iconLeft && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {iconLeft}
          </div>
        )}
        {getIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getIcon}
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && !searchTerminated && !isAutofilled && (
        <div
          ref={suggestionsRef}
          className="absolute z-[9999] w-full mt-1 bg-white dark:bg-background border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-auto"
        >

          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.value}-${index}`}
              className={cn(
                "px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center transition-none",
                selectedIndex === index && "bg-blue-100 dark:bg-blue-900/30"
              )}
              onClick={() => handleSuggestionClick(suggestion.value)}
            >
              {suggestion.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}));

AutocompleteInput.displayName = "AutocompleteInput";