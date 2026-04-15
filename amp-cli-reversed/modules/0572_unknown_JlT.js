function JlT(T) {
  if (!T.output_format) return T;
  if (T.output_config?.format) throw new f9("Both output_format and output_config.format were provided. Please use only output_config.format (output_format is deprecated).");
  let {
    output_format: R,
    ...a
  } = T;
  return {
    ...a,
    output_config: {
      ...T.output_config,
      format: R
    }
  };
}