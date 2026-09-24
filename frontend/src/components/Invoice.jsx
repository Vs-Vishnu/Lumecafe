import React from 'react';

const Invoice = ({ order, businessSettings }) => {
  if (!order) return null;

  const currency = businessSettings?.currency || '₹';

  // Format date and time
  const orderDate = new Date(order.date || order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = orderDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="receipt-container">
      {/* Header */}
      <div className="text-center mb-4 flex flex-col items-center justify-center">
        {businessSettings?.logo && (
          <img src={businessSettings.logo} alt="Logo" className="max-h-12 object-contain mb-2 print-only-logo" />
        )}
        <h2 className="text-base font-extrabold tracking-tight uppercase">
          {businessSettings?.businessName || 'LumeBills'}
        </h2>
        <p className="text-[11px] font-medium leading-normal whitespace-pre-line">
          {businessSettings?.address || 'Store Address'}
        </p>
        <p className="text-[11px] font-medium mt-1">
          Phone: {businessSettings?.phone || 'Store Phone'}
        </p>
        {businessSettings?.email && (
          <p className="text-[11px] font-medium">
            Email: {businessSettings.email}
          </p>
        )}
        {businessSettings?.gstNumber && (
          <p className="text-[11px] font-bold mt-1 uppercase border-y border-dashed border-black py-0.5">
            GSTIN: {businessSettings.gstNumber}
          </p>
        )}
      </div>

      {/* Meta Info */}
      <div className="border-b border-dashed border-black pb-2 mb-2 text-[11px] font-medium space-y-0.5">
        <div className="flex justify-between">
          <span>Invoice No:</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formattedDate} {formattedTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier:</span>
          <span className="capitalize">{order.cashierName || 'Staff'}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer:</span>
          <span className="font-semibold">{order.customerDetails?.name || 'Walk-in Customer'}</span>
        </div>
        {order.customerDetails?.phone && (
          <div className="flex justify-between">
            <span>Contact:</span>
            <span>{order.customerDetails.phone}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <table className="w-full text-[11px] border-b border-dashed border-black mb-2">
        <thead>
          <tr className="border-b border-dashed border-black font-bold">
            <th className="text-left pb-1 w-[45%]">Item</th>
            <th className="text-center pb-1 w-[15%]">Qty</th>
            <th className="text-right pb-1 w-[20%]">Price</th>
            <th className="text-right pb-1 w-[20%]">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, idx) => (
            <tr key={idx} className="font-medium">
              <td className="py-1 align-top leading-tight truncate max-w-[120px]" title={item.name}>
                <div>
                  <span className="block font-bold">{item.name}</span>
                  {item.discountAmount > 0 && (
                    <span className="text-[9px] text-amber-900 font-bold block">
                      🏷️ Savings: -{currency}{(item.discountAmount * item.quantity).toFixed(2)}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-1 text-center align-top">{item.quantity}</td>
              <td className="py-1 text-right align-top">
                {item.discountAmount > 0 ? (
                  <div>
                    <span className="line-through text-gray-400 text-[9px] block">{currency}{(item.originalPrice || (item.price + item.discountAmount)).toFixed(2)}</span>
                    <span>{currency}{item.price.toFixed(2)}</span>
                  </div>
                ) : (
                  <span>{currency}{item.price.toFixed(2)}</span>
                )}
              </td>
              <td className="py-1 text-right align-top font-bold">
                {currency}{item.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Summary */}
      <div className="text-[11px] font-medium space-y-1 mb-4 border-b border-dashed border-black pb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currency}{order.subtotal?.toFixed(2)}</span>
        </div>
        {order.items?.reduce((s, i) => s + (i.discountAmount || 0) * i.quantity, 0) > 0 && (
          <div className="flex justify-between text-emerald-700 font-bold">
            <span>Promotional Savings:</span>
            <span>-{currency}{order.items.reduce((s, i) => s + (i.discountAmount || 0) * i.quantity, 0).toFixed(2)}</span>
          </div>
        )}
        {order.discount > 0 && (
          <div className="flex justify-between text-red-600 font-semibold">
            <span>Order Discount:</span>
            <span>-{currency}{order.discount?.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax:</span>
          <span>{currency}{order.tax?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs font-black border-t border-dotted border-black pt-1">
          <span>GRAND TOTAL:</span>
          <span>{currency}{order.grandTotal?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] mt-1 border-t border-dotted border-black pt-1">
          <span>Payment Mode:</span>
          <span className="font-bold uppercase">{order.paymentMethod}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] font-bold uppercase space-y-0.5">
        <p className="tracking-widest">Thank You!</p>
        <p className="tracking-wider">Visit Again!</p>
      </div>
    </div>
  );
};

export default Invoice;
