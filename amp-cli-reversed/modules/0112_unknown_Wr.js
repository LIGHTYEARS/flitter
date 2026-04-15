function Wr({
  initialBufferLength: T = 1024,
  maxBufferLength: R = 33554432
}) {
  if (Hr) ze(un(T), $i), ze(un(R), $i), ze(T <= R, "initialBufferLength must be lower than or equal to maxBufferLength");
  return {
    initialBufferLength: T,
    maxBufferLength: R
  };
}