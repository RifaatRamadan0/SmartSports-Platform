export const parseApiError = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err.response?.data;
  if (data?.errors) {
    return Object.entries(data.errors)
      .flatMap(([field, messages]) => messages.map(m => `${field}: ${m}`))
      .join('; ');
  }
  return (
    data?.detail ||
    data?.message ||
    data?.title ||
    err.message ||
    fallback
  );
};