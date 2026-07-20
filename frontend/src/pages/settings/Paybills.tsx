import { ResourcePage } from "../../components/ui/ResourcePage";
import { paybillsApi } from "../../api/paybills";
import type { Paybill } from "../../types";

export default function Paybills() {
  return (
    <ResourcePage<Paybill>
      title="Payment Methods"
      description="Configure M-Pesa paybill numbers for fee collection. Each paybill can have its own Daraja credentials."
      canWrite={true}
      fields={[
        { name: "name", label: "Paybill Name", required: true, placeholder: "e.g. School Tuition Paybill" },
        { name: "shortcode", label: "Business Shortcode", required: true, placeholder: "e.g. 174379" },
        { name: "accountReferenceFormat", label: "Account Ref Format", required: true, placeholder: "e.g. {firstname}{lastname}-{grade}" },
        { name: "purpose", label: "Purpose", type: "select", required: true, options: [
          { value: "tuition", label: "Tuition" },
          { value: "trip", label: "Trip" },
          { value: "event", label: "Event" },
          { value: "custom", label: "Custom" },
        ]},
        { name: "darajaConsumerKeyRef", label: "Consumer Key Ref", required: true, placeholder: "ref:mpesa_consumer_key" },
        { name: "darajaConsumerSecretRef", label: "Consumer Secret Ref", required: true, placeholder: "ref:mpesa_consumer_secret" },
        { name: "darajaPasskeyRef", label: "Passkey Ref", required: true, placeholder: "ref:mpesa_passkey" },
        { name: "isActive", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { header: "Name", cell: (p) => p.name },
        { header: "Shortcode", cell: (p) => p.shortcode },
        { header: "Purpose", cell: (p) => p.purpose },
        { header: "Active", cell: (p) => p.isActive ? "Yes" : "No" },
      ]}
      fetchList={() => paybillsApi.list()}
      createItem={(p) => paybillsApi.create(p)}
      updateItem={(id, p) => paybillsApi.update(id, p)}
      deleteItem={(id) => paybillsApi.remove(id)}
    />
  );
}
