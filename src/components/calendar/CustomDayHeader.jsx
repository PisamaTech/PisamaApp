import { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";

export const CustomDayHeader = ({ date, localizer }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detectar el tamaño de pantalla inicial
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // 640px es el breakpoint sm de Tailwind
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const formatDate = () => {
    const dayjsDate = dayjs(date);

    if (isMobile) {
      // Formato móvil: "Lun 15", "Mar 16", etc.
      const dayAbbr = dayjsDate.format("ddd"); // "lun", "mar", "mié", etc.
      const dayNumber = dayjsDate.format("D"); // "15", "16", etc.
      // Capitalizar primera letra (sin punto)
      const dayCapitalized = dayAbbr.charAt(0).toUpperCase() + dayAbbr.slice(1);
      return `${dayCapitalized} ${dayNumber}`;
    } else {
      // Formato desktop: "Lunes 15"
      const dayFull = dayjsDate.format("dddd"); // "lunes", "martes", etc.
      const dayNumber = dayjsDate.format("D"); // "15", "16", etc.
      // Capitalizar primera letra
      const dayCapitalized = dayFull.charAt(0).toUpperCase() + dayFull.slice(1);
      return `${dayCapitalized} ${dayNumber}`;
    }
  };

  return (
    <div className="text-center">
      {formatDate()}
    </div>
  );
};
