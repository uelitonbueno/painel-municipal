import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MunicipalityProvider } from "@/contexts/MunicipalityContext";
import AdminPages from "@/pages/AdminPages";
import { HomePage, IndicatorsPage, ServicesPage, TransparencyPage } from "@/pages/PublicPages";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <Switch>
    <Route path="/" component={HomePage} />
    <Route path="/indicadores" component={IndicatorsPage} />
    <Route path="/transparencia" component={TransparencyPage} />
    <Route path="/servicos" component={ServicesPage} />
    <Route path="/admin/:rest*?" component={AdminPages} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><MunicipalityProvider><Toaster /><Router /></MunicipalityProvider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
