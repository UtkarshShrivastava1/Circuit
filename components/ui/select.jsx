import { forwardRef } from "react";

const Select = forwardRef(({ children, ...props }, ref) => (
  <select ref={ref} className="w-full input" {...props}>
    {children}
  </select> 
));

Select.displayName = "Select";

export { Select };
