import { createContext, useContext } from 'react';

export const ToastContext = createContext({ success() {}, error() {}, info() {}, dismiss() {} });
/** toast.success('Saved'), toast.error(message), toast.info(message) */
export const useToast = () => useContext(ToastContext);
