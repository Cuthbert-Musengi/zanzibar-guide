import React from "react";

type TypingIndicatorProps = {
  text?: string;
};

export default function TypingIndicator({ text = "Finding the right island details" }: TypingIndicatorProps) {
  return (
    <span className="zd-typing" aria-live="polite" role="status">
      <i />
      <i />
      <i />
      <span>{text}</span>
    </span>
  );
}
