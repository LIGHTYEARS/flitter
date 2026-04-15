function GN0(T) {
  if (T >= 900000) return {
    recommendation: 0.2,
    warning: 0.8,
    danger: 0.9
  };else if (T >= 400000) return {
    recommendation: 0.7,
    warning: 0.8,
    danger: 0.9
  };else return {
    recommendation: 0.8,
    warning: 0.9,
    danger: 0.95
  };
}