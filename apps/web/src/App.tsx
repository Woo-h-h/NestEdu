import { Toaster } from "sonner";
import Routers from "@/routes";

function App() {
  return (
    <>
      <Routers />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
