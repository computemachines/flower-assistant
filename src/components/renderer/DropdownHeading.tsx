const DropdownHeading = ({ className, children }) => {
  return (
    <div className={`flex items-center justify-left gap-2 p-2 ${className}`}>
      <h2 className="text-lg font-semibold">{children}</h2>
      <svg className="w-4 h-4 opacity-50" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* SVG down triangle icon */}
        <path d="M5 8L10 13L15 8H5Z" fill="currentColor" />
      </svg>
    </div>
  );
};

export default DropdownHeading;
