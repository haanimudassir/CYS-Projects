// Helper functions for IRLMS backend

const generateRefNo = (year, seq) => {
  return `IRLMS-${year}-${String(seq).padStart(4, '0')}`;
};

const calculateSLAStatus = (reportedAt, slaHours) => {

  if (!reportedAt) {
    return 'Unknown';
  }


  const elapsed =
    (new Date() - new Date(reportedAt)) /
    (1000 * 60 * 60);


  return elapsed > slaHours
    ? 'BREACHED'
    : 'Within SLA';
};



const formatDuration = (minutes) => {

  if (!minutes) {
    return 'N/A';
  }


  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;


  return hours > 0
    ? `${hours}h ${mins}m`
    : `${mins}m`;
};



module.exports = {
  generateRefNo,
  calculateSLAStatus,
  formatDuration
};