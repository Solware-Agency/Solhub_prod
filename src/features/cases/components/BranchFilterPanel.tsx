import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Card } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Label } from '@shared/components/ui/label';

interface BranchFilterPanelProps {
  branches: Array<{ value: string; label: string }>;
  selectedBranches: string[];
  onFilterChange: (branches: string[]) => void;
  className?: string;
}

const BranchFilterPanel: React.FC<BranchFilterPanelProps> = ({
  branches,
  selectedBranches,
  onFilterChange,
  className,
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

  return (
    <Card className={`p-3 sm:p-4 ${className || ''}`}>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar sede"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="max-h-[200px] overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded-md">
        {filteredBranches.length > 0 ? (
          <div className="space-y-1 p-2">
            {filteredBranches.map((branch) => (
              <div
                key={branch.value}
                className="flex items-center space-x-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded-md transition-none text-sm"
              >
                <Checkbox
                  id={`branch-${branch.value}`}
                  checked={selectedBranches.includes(branch.value)}
                  onCheckedChange={() => handleToggleBranch(branch.value)}
                />
                <Label htmlFor={`branch-${branch.value}`} className="flex-1 cursor-pointer text-sm">
                  {branch.label}
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron sedes con ese nombre' : 'No hay sedes disponibles'}
          </div>
        )}
      </div>

      {selectedBranches.length > 0 && (
        <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sedes seleccionadas:</span>
            <span className="text-sm font-bold text-primary">{selectedBranches.length}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 sm:gap-2">
            {selectedBranches.map((branchValue) => {
              const branch = branches.find((b) => b.value === branchValue);
              return (
                <div
                  key={`selected-${branchValue}`}
                  className="bg-primary/10 text-primary text-xs px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1"
                >
                  <span className="max-w-[120px] sm:max-w-none truncate">{branch?.label || branchValue}</span>
                  <button onClick={() => handleToggleBranch(branchValue)} className="hover:text-primary/80">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default BranchFilterPanel;
