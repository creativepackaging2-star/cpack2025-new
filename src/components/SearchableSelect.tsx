'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';

interface Option {
    id: number | string;
    name: string;
    [key: string]: any;
}

interface SearchableSelectProps {
    options: Option[];
    value: number | string | null;
    onChange: (value: number | string | null) => void;
    onAdd?: (newName: string) => Promise<Option | null | void>;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    displayField?: string;
    className?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    onAdd,
    label,
    placeholder = "Select...",
    disabled = false,
    displayField = 'name',
    className = ''
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial value syncing
    useEffect(() => {
        if (value) {
            const selected = options.find(o => o.id === value);
            if (selected) {
                setSearchTerm(selected[displayField]);
            }
        } else {
            setSearchTerm('');
        }
    }, [value, options, displayField]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset search term to selected value if nothing changed
                if (value) {
                    const selected = options.find(o => o.id === value);
                    if (selected) setSearchTerm(selected[displayField]);
                    else setSearchTerm('');
                } else {
                    setSearchTerm('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options, displayField]);

    const filteredOptions = options.filter(option =>
        String(option[displayField]).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option: Option) => {
        onChange(option.id);
        setSearchTerm(option[displayField]);
        setIsOpen(false);
    };

    const handleAddNew = async () => {
        if (!onAdd || !searchTerm.trim()) return;
        setIsAdding(true);
        try {
            await onAdd(searchTerm.trim());
            // The parent is expected to update 'options' and 'value'
            // We just keep the searchTerm as is (it matches the new item's name)
            setIsOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}

            <div className="relative">
                <input
                    type="text"
                    className="block w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                        // Optional: clear selection if user modifies text? 
                        // For now we keep the 'value' until they select something new or we strictly enforce it. 
                        // But typically combobox clears value if text doesn't match.
                        // Let's keep it simple: if valid match, maybe auto-select? No, let user click.
                        // Ideally: onChange(null) if text changes?
                        // Let's decide: Text change doesn't clear ID immediately to avoid flicker, 
                        // but logic usually demands strict match. 
                        // We will allow free text, but valid submission requires ID.
                    }}
                    onFocus={() => setIsOpen(true)}
                    disabled={disabled}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                    <ChevronsUpDown className="h-4 w-4" />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <div
                                key={option.id}
                                className={`relative cursor-pointer select-none py-2 pl-10 pr-4 ${option.id === value ? 'bg-indigo-50 text-indigo-900' : 'text-slate-900 hover:bg-slate-100'
                                    }`}
                                onClick={() => handleSelect(option)}
                            >
                                <span className={`block truncate ${option.id === value ? 'font-medium' : 'font-normal'}`}>
                                    {option[displayField]}
                                </span>
                                {option.id === value && (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                        <Check className="h-4 w-4" />
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-2 text-slate-500 text-sm">No results found.</div>
                    )}

                    {onAdd && searchTerm && !filteredOptions.find(o => o[displayField].toLowerCase() === searchTerm.toLowerCase()) && (
                        <button
                            type="button"
                            className="w-full text-left relative cursor-pointer select-none py-2 pl-10 pr-4 text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-2 border-t border-slate-100"
                            onClick={handleAddNew}
                            disabled={isAdding}
                        >
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Add "{searchTerm}"
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
