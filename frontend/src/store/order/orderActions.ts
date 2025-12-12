import { AppDispatch } from "../redux_store";
import {
  createOrder,
  getOrderDetails,
  listOrders,
  cancelOrder,
  type CreateOrderRequest,
} from "@/services/auth/order.api";
import {
  setOrders,
  setOrderDetail,
  setLoading,
  setError,
} from "./orderReducer";

export const createOrderAction =
  (payload: CreateOrderRequest) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response = await createOrder(payload);

      if (response.code === 201 || response.code === 200) {
        return { success: true, data: response.data };
      }

      dispatch(setError(response.message ?? "Unknown error"));
      return { success: false, error: response.message ?? "Unknown error" };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      dispatch(setError(errorMessage));
      return { success: false, error: errorMessage };
    }
  };
  
  export const fetchOrderList = () => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response = await listOrders();
      dispatch(setOrders(response.data ?? []));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      dispatch(setError(errorMessage));
    }
  };

export const fetchOrderDetail =
  (orderId: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response = await getOrderDetails(orderId);
      dispatch(setOrderDetail(response.data ?? null));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      dispatch(setError(errorMessage));
    }
  };

export const cancelOrderAction =
  (orderId: string, reason?: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      await cancelOrder(orderId, reason);
      dispatch(fetchOrderList());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      dispatch(setError(errorMessage));
    }
  };
