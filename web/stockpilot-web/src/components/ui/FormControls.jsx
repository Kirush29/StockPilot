import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon } from './Icons';

export function FormInput({
  label,
  type = 'text',
  value,
  onChange,
  error,
  required,
  optionalText,
  placeholder,
  maxLength,
  disabled,
  prefix,
  suffix,
  className = '',
  ...props
}) {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label>
          {label}{' '}
          {required && <span className="required">*</span>}
          {!required && optionalText && (
            <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85em', marginLeft: '4px' }}>
              (Optional)
            </span>
          )}
        </label>
      )}
      <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span className="input-prefix" style={{ position: 'absolute', left: 12, color: 'var(--color-text-muted)' }}>{prefix}</span>}
        <input
          type={type}
          className={`form-control ${error ? 'error' : ''}`}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          style={{ 
            paddingLeft: prefix ? '32px' : undefined,
            paddingRight: suffix ? '32px' : undefined 
          }}
          {...props}
        />
        {suffix && <span className="input-suffix" style={{ position: 'absolute', right: 12, color: 'var(--color-text-muted)' }}>{suffix}</span>}
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export function SearchableDropdown({
  label,
  value,
  onChange,
  options = [],
  error,
  required,
  placeholder = 'Select...',
  disabled,
  loading,
  emptyMessage = 'No options available',
  renderOption = (opt) => opt.label,
  getOptionValue = (opt) => opt.value,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    if (!search) return true;
    const labelStr = renderOption(opt)?.toString()?.toLowerCase() || '';
    return labelStr.includes(search.toLowerCase());
  });

  const selectedOption = options.find(o => getOptionValue(o) === value);

  return (
    <div className="form-group" ref={wrapperRef} style={{ position: 'relative' }}>
      {label && (
        <label>
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <div 
        className={`form-control select-control ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{selectedOption ? renderOption(selectedOption) : <span style={{ color: 'var(--color-text-muted)' }}>{placeholder}</span>}</span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>
      
      {isOpen && (
        <div 
          className="dropdown-menu" 
          style={{ 
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, 
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '6px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '250px', overflowY: 'auto'
          }}
        >
          <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="search-input-group" style={{ margin: 0, width: '100%' }}>
              <SearchIcon style={{ width: 14, height: 14 }} />
              <input 
                type="text" 
                autoFocus
                placeholder="Search..." 
                className="search-input"
                style={{ padding: '6px 6px 6px 30px', fontSize: '13px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div style={{ padding: '4px' }}>
            {loading ? (
              <div style={{ padding: '8px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading...</div>
            ) : filteredOptions.length === 0 ? (
              <div style={{ padding: '8px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>{emptyMessage}</div>
            ) : (
              filteredOptions.map((opt, i) => (
                <div 
                  key={i}
                  style={{ 
                    padding: '8px 12px', cursor: 'pointer', borderRadius: '4px',
                    background: getOptionValue(opt) === value ? 'var(--color-primary-light)' : 'transparent',
                    color: getOptionValue(opt) === value ? 'var(--color-primary-dark)' : 'inherit',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => { if (getOptionValue(opt) !== value) e.target.style.background = 'var(--color-bg-alt)'; }}
                  onMouseLeave={(e) => { if (getOptionValue(opt) !== value) e.target.style.background = 'transparent'; }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(getOptionValue(opt));
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {renderOption(opt)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
