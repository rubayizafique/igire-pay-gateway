const express = require('express');
const { handlePayment } = require('./paymentHandler');

const app = express();

app.use(express.json());

app.post('/process-payment', handlePayment);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

if (require.main === module) {
  const PORT = 8080;
  app.listen(PORT, () => {
    console.log(`IgirePay Gateway running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;