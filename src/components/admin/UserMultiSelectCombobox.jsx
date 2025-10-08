import { useState, useMemo } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Un componente combobox para seleccionar múltiples usuarios de una lista.
 * @param {Array<object>} users - Array de objetos de usuario. Cada uno debe tener 'id', 'firstName', 'lastName'.
 * @param {Array<string>} selectedUserIds - Array de IDs de los usuarios seleccionados.
 * @param {function} onUsersChange - Función a llamar cuando la selección cambia. Devuelve el nuevo array de IDs.
 * @param {string} placeholder - Texto a mostrar cuando no hay usuarios seleccionados.
 */
export const UserMultiSelectCombobox = ({
  users = [],
  selectedUserIds = [],
  onUsersChange,
  placeholder = "Seleccionar usuarios...",
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelect = (userId) => {
    const newSelectedIds = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];
    onUsersChange(newSelectedIds);
  };

  const handleClearAll = () => {
    onUsersChange([]);
  };

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)),
    [users, selectedUserIds]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <div
            className={cn(
              "flex flex-wrap gap-1 rounded-md border border-input bg-background p-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              "min-h-[40px] cursor-text"
            )}
            onClick={() => setOpen(true)}
          >
            {selectedUsers.length > 0 ? (
              selectedUsers.map((user) => (
                <Badge key={user.id} variant="secondary">
                  {user.firstName} {user.lastName}
                  <button
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que el popover se abra/cierre
                      handleSelect(user.id);
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Buscar usuario..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>No se encontró ningún usuario.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.firstName} ${user.lastName} ${user.email}`}
                onSelect={() => handleSelect(user.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedUserIds.includes(user.id)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {user.firstName} {user.lastName}
              </CommandItem>
            ))}
          </CommandGroup>
          {selectedUserIds.length > 0 && (
            <CommandGroup>
              <CommandItem
                onSelect={handleClearAll}
                className="text-center text-red-500 justify-center"
              >
                Limpiar selección
              </CommandItem>
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};