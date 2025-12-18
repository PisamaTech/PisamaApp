import { useState, useEffect } from "react";

export const CustomResourceHeader = ({ label }) => {
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

  // Función para abreviar el texto
  const getAbbreviation = (text) => {
    // Extraer el número del consultorio
    const match = text.match(/\d+/);
    if (match) {
      return `C${match[0]}`;
    }
    return text;
  };

  return (
    <div className="text-center">
      {isMobile ? getAbbreviation(label) : label}
    </div>
  );
};
