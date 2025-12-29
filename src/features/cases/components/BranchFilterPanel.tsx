import React, { useMemo, useState } from 'react';
import { Input } from '@shared/components/ui/input';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Label } from '@shared/components/ui/label';

interface BranchFilterPanelProps {
  branches: Array<{ value: string; label: string }>;
  selectedBranches: string[];
  onFilterChange: (branches: string[]) => void;
}

const BranchFilterPanel: React.FC<BranchFilterPanelProps> = ({
  branches,
  selectedBranches,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBranches = useMemo(() => {
    if (!searchTerm) return branches;
    
    return branches.filter((branch) =>
      branch.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [branches, searchTerm]);

  const handleToggleBranch = (branchValue: string) => {
    if (selectedBranches.includes(branchValue)) {
      onFilterChange(selectedBranches.filter((b) => b !== branchValue));
    } else {
      onFilterChange([...selectedBranches, branchValue]);
    }
  };

  const handleSelectAll = () => {
    if (selectedBranches.length === branches.length) {
      onFilterChange([]);
    } else {
      onFilterChange(branches.map((b) => b.value));
    }
  };

  return (
    <div className='space-y-3'>
      <Input
        type='text'
        placeholder='Buscar sede...'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className='w-full'
      />

      <div className='flex items-center justify-between py-2 border-b'>
        <button
          onClick={handleSelectAll}
          className='text-sm text-primary hover:underline'
        >
          {selectedBranches.length === branches.length
            ? 'Deseleccionar todas'
            : 'Seleccionar todas'}
        </button>
        <span className='text-sm text-muted-foreground'>
          {selectedBranches.length} seleccionada{selectedBranches.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className='max-h-64 overflow-y-auto space-y-1'>
        {filteredBranches.length > 0 ? (
          filteredBranches.map((branch) => (
            <div
              key={branch.value}
              className='flex items-center space-x-2 py-2 hover:bg-accent px-2 rounded-md transition-colors'
            >
              <Checkbox
                id={`branch-${branch.value}`}
                checked={selectedBranches.includes(branch.value)}
                onCheckedChange={() => handleToggleBranch(branch.value)}
              />
              <Label
                htmlFor={`branch-${branch.value}`}
                className='flex-1 cursor-pointer text-sm'
              >
                {branch.label}
              </Label>
            </div>
          ))
        ) : (
          <p className='text-sm text-muted-foreground text-center py-4'>
            No se encontraron sedes
          </p>
        )}
      </div>
    </div>
  );
};

export default BranchFilterPanel;
