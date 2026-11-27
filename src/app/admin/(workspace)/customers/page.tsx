import type { Metadata } from "next";
import { AdminNotice, AdminPageHeader } from "@/features/admin/components/admin-ui";
import { getAdminCustomers } from "@/features/admin/server/customer-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  const result = await getAdminCustomers();
  return (
    <div className="admin-page-stack">
      <AdminPageHeader eyebrow="Commerce" title="Customers" />
      {result.status === "error" ? (
        <AdminNotice tone="error">Customer records could not be loaded.</AdminNotice>
      ) : result.customers.length === 0 ? (
        <section className="admin-empty-state">
          <h2>No customer orders yet</h2>
          <p>Guest order contacts are not converted into customer accounts.</p>
        </section>
      ) : (
        <div className="admin-table-wrap admin-table-wrap--cards">
          <table className="admin-table">
            <caption className="sr-only">Customers with account-linked orders</caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Contact</th>
                <th scope="col">Orders</th>
                <th scope="col">Latest order</th>
              </tr>
            </thead>
            <tbody>
              {result.customers.map((customer) => (
                <tr key={customer.userId}>
                  <td data-label="Customer">{customer.name}</td>
                  <td data-label="Contact">{customer.email || customer.phone}</td>
                  <td data-label="Orders">{customer.orderCount}</td>
                  <td data-label="Latest order">
                    {customer.lastOrderReference} · {formatStatus(customer.lastOrderStatus)} ·{" "}
                    {formatDate(customer.lastOrderAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "Asia/Colombo" }).format(
    new Date(value),
  );
}
