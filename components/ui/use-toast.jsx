import { useState } from "react";

export function useToast() {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ open: true, message, type });
    setTimeout(() => setToast({ ...toast, open: false }), 3000);
  };

  return {
    toast,
    showToast,
  };
}
