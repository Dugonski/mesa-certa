import { useState, useEffect, useRef, useCallback } from "react";
import { can } from "../../../../packages/shared/permissions.js";
const api = window.restaurant;
const blank = {
  tables: [],
  tabs: [],
  products: [],
  history: [],
  users: [],
  auditLogs: [],
};

export function useRestaurant() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(blank);
  const [page, setPage] = useState("tabs");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const refreshSequence = useRef(0);
  const lock = useRef(false);
  const authorized = useRef(false);
  const selected = [...data.tabs, ...data.history].find(
    (tab) => tab.id === selectedId,
  );
  const allowed = (permission) => can(user?.role, permission);
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const snapshot = await api.request("snapshot");
    if (authorized.current && sequence === refreshSequence.current)
      setData(snapshot);
  }, []);
  const handleError = useCallback((error) => {
    setError(error.message);
    if (error.code === "UNAUTHORIZED") {
      authorized.current = false;
      setUser(null);
      setData(blank);
      setModal(null);
    }
  }, []);
  useEffect(
    () =>
      api?.onEvent((event) => {
        if (event.event === "disconnected") {
          authorized.current = false;
          refreshSequence.current++;
          setUser(null);
          setData(blank);
          setSelectedId(null);
          setModal(null);
          setError(
            "Conexão interrompida. Entre novamente para consultar os dados atualizados.",
          );
        } else if (event.event === "changed" && authorized.current)
          refresh().catch(handleError);
      }),
    [refresh, handleError],
  );
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function operate(work) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
      return true;
    } catch (error) {
      handleError(error);
      if (error.code === "CONFLICT") await refresh().catch(handleError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function mutate(action, payload, success) {
    return operate(async () => {
      const result = await api.request(action, payload);
      setModal(null);
      if (action === "tabs.open") setSelectedId(result.id);
      await refresh();
      setToast(success);
    });
  }
  function navigate(next) {
    setPage(next);
    setSearch("");
    setSelectedId(null);
    setError("");
  }
  function exportXml(id) {
    return operate(async () => {
      const result = await api.saveXml(id);
      if (!result.canceled) setToast("XML salvo.");
    });
  }

  function login(input) {
    return operate(async () => {
      const current = await api.login(input);
      authorized.current = true;
      await refresh();
      setUser(current);
      setPage("tabs");
      setSelectedId(null);
    });
  }
  function logout() {
    return operate(async () => {
      try {
        await api.logout();
      } finally {
        authorized.current = false;
        setUser(null);
        setData(blank);
        setModal(null);
      }
    });
  }
  return {
    user,
    data,
    page,
    setPage,
    selected,
    setSelectedId,
    search,
    setSearch,
    modal,
    setModal,
    busy,
    error,
    setError,
    toast,
    allowed,
    refresh,
    operate,
    mutate,
    navigate,
    exportXml,
    login,
    logout,
  };
}
