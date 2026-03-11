import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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

      <div className="max-h-50 overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded-md">
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
    </Card>
  );
};

export default BranchFilterPanel;
