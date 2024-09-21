import { api } from "@minikura/api";

async function fetchData() {
  const response = await api.index.get();
  return response;
}

export default async function Page() {
  const data = await fetchData();

  return (
    <div>
      <h1>Hello React</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
