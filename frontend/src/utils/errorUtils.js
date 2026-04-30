export const parseApiError = (err, fallback = 'Something went wrong. Please try again.') => {
  return (
    err.response?.data?.detail ||
    err.response?.data?.message ||
    err.response?.data?.title ||
    err.message ||
    fallback
  );
};