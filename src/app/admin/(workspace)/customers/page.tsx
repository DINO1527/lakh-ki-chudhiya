import type { Metadata } from "next";
import { getAdminCustomers } from "@/features/admin/server/customer-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  const result = await getAdminCustomers();
  return (
    <div className="admin-page-stack">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Commerce</p>
          <h1 className="admin-page-title">Customers</h1>
          <p className="admin-page-description">
            Customer accounts that have placed an order. Guest contacts remain with their order
            only.
          </p>
        </div>
      </header>
      {result.status === "error" ? (
        <p className="admin-notice admin-notice--error" role="alert">
          Customer records could not be loaded.
        </p>
      ) : result.customers.length === 0 ? (
        <section className="admin-empty-state">
          <h2>No customer orders yet</h2>
          <p>
            Registered customers appear after they place an account-linked order. Guest order
            contacts are not converted into customer accounts.
          </p>
        </section>
      ) : (
        <div className="admin-table-wrap">
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
                  <td>{customer.name}</td>
                  <td>{customer.email || customer.phone}</td>
                  <td>{customer.orderCount}</td>
                  <td>
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
