import { useState } from "react";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/";

import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Un componente combobox para seleccionar un usuario de una lista, con capacidad de búsqueda.
 * @param {Array<object>} users - El array de objetos de usuario. Cada usuario debe tener 'id', 'firstName', 'lastName'.
 * @param {string} selectedUserId - El ID del usuario actualmente seleccionado.
 * @param {function} onSelect - La función a llamar cuando se selecciona un usuario. Devuelve el ID.
 */
export const UserCombobox = ({ users, selectedUserId, onSelect }) => {
  const [open, setOpen] = useState(false);

  // Encuentra el nombre del usuario seleccionado para mostrarlo en el botón
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const displayValue = selectedUser
    ? `${selectedUser.firstName} ${selectedUser.lastName}`
    : "Todos los usuarios";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar usuario..." />
          <CommandEmpty>No se encontró ningún usuario.</CommandEmpty>
          <CommandGroup>
            {/* Opción para seleccionar "Todos" */}
            <CommandItem
              onSelect={() => {
                onSelect("todos");
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedUserId === "todos" ? "opacity-100" : "opacity-0"
                )}
              />
              Todos los usuarios
            </CommandItem>

            {/* Mapea y muestra cada usuario */}
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.firstName} ${user.lastName} ${user.email}`} // El valor para la búsqueda
                onSelect={() => {
                  onSelect(user.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedUserId === user.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {user.firstName} {user.lastName}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
