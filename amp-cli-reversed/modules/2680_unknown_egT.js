function egT(T, R) {
  if (T.length > R + 5 && T[R + 1] === "-" && T[R + 2] === "-") {
    for (R += 3; R < T.length; R++) if (T[R] === "-" && T[R + 1] === "-" && T[R + 2] === ">") {
      R += 2;
      break;
    }
  } else if (T.length > R + 8 && T[R + 1] === "D" && T[R + 2] === "O" && T[R + 3] === "C" && T[R + 4] === "T" && T[R + 5] === "Y" && T[R + 6] === "P" && T[R + 7] === "E") {
    let a = 1;
    for (R += 8; R < T.length; R++) if (T[R] === "<") a++;else if (T[R] === ">") {
      if (a--, a === 0) break;
    }
  } else if (T.length > R + 9 && T[R + 1] === "[" && T[R + 2] === "C" && T[R + 3] === "D" && T[R + 4] === "A" && T[R + 5] === "T" && T[R + 6] === "A" && T[R + 7] === "[") {
    for (R += 8; R < T.length; R++) if (T[R] === "]" && T[R + 1] === "]" && T[R + 2] === ">") {
      R += 2;
      break;
    }
  }
  return R;
}