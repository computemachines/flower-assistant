import React, {
  UIEventHandler,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const ScrollContext = createContext([0, 0]);

interface ScrollProviderProps {
  className?: string;
  children: React.ReactNode;
}

export const ScrollContainer: React.FC<ScrollProviderProps> = ({
  className,
  children,
}) => {
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const handleScroll: UIEventHandler = (e) => {
    const target = e.target as HTMLDivElement; // the onScroll is attached to a div in the render function
    setScrollY(target.scrollTop);
  };

  return (
    <ScrollContext.Provider value={[scrollX, scrollY]}>
      <div onScroll={handleScroll} className={className}>
        {children}
      </div>
    </ScrollContext.Provider>
  );
};

export const useScroll = () => useContext(ScrollContext);
