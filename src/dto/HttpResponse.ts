export interface HttpResponse<T> {
    success: boolean;
    message: string;
    error: any;
    data: T;
}
