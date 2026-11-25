const ORDER_STEPS = [
  { status: "pending_confirmation", label: "Received" },
  { status: "confirmed", label: "Confirmed" },
  { status: "processing", label: "Preparing" },
  { status: "packed", label: "Packed" },
  { status: "dispatched", label: "Dispatched" },
  { status: "delivered", label: "Delivered" },
] as const;

type OrderProgressProps = {
  status: string;
};

export function OrderProgress({ status }: OrderProgressProps) {
  const currentIndex = ORDER_STEPS.findIndex((step) => step.status === status);

  if (currentIndex < 0) {
    const label = status === "delivery_failed" ? "Delivery needs attention" : "Order cancelled";
    const message =
      status === "delivery_failed"
        ? "The delivery was not completed. Contact the store if you need help with the next step."
        : "This order has been cancelled. Its payment status is shown separately below.";
    return (
      <div className="order-progress order-progress--exception" role="status">
        <strong>{label}</strong>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="order-progress">
      <p className="order-progress__intro">
        {status === "pending_confirmation"
          ? "Your order is saved and waiting for the store to confirm availability and delivery."
          : "Your order is moving through the steps below. Payment remains a separate status."}
      </p>
      <ol aria-label="Order fulfilment progress" className="order-progress__steps">
        {ORDER_STEPS.map((step, index) => (
          <li
            aria-current={index === currentIndex ? "step" : undefined}
            className="order-progress__step"
            data-state={
              index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming"
            }
            key={step.status}
          >
            <span aria-hidden="true" className="order-progress__marker">
              {index < currentIndex ? "✓" : index + 1}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
