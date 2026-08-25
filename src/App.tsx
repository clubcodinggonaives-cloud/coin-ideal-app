import { RouterProvider } from "react-router-dom"
import { Providers } from "@/app/providers"
import { router } from "@/app/router"
import { AppErrorBoundary } from "@/components/error-boundary"

function App() {
  return (
    <AppErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </AppErrorBoundary>
  )
}

export default App
