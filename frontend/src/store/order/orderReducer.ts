import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Order } from "@/services/auth/order.api";

export interface OrderState {
  orders: Order[];
  orderDetail: Order | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  orderDetail: null,
  loading: false,
  error: null,
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    setOrders(state, action: PayloadAction<Order[]>) {
      state.orders = action.payload;
      state.loading = false;
    },
    setOrderDetail(state, action: PayloadAction<Order | null>) {
      state.orderDetail = action.payload;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setOrders, setOrderDetail, setLoading, setError } =
  orderSlice.actions;
export default orderSlice.reducer;
