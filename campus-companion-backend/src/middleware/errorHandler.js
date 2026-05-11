const errorHandler = (err, c) => {
  console.error(err);

  if (err.name === 'ZodError') {
    return c.json({ success: false, message: 'Validation error', errors: err.errors }, 400);
  }

  return c.json(
    { success: false, message: err.message || 'Internal Server Error' },
    err.status || 500
  );
};

module.exports = errorHandler;