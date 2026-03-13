using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Interfaces.Services;
using PrintHub.API.Extensions;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    // ─── Customer endpoints ───────────────────────────────────────────────

    /// <summary>
    /// Create a new order.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<OrderResponse>> CreateOrder(
        CreateOrderRequest request)
    {
        var userId = User.GetUserId();
        var order = await _orderService.CreateOrderAsync(userId, request);
        return CreatedAtAction(
            nameof(GetOrder),
            new { id = order.Id },
            order);
    }

    /// <summary>
    /// Get a specific order by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderResponse>> GetOrder(Guid id)
    {
        var order = await _orderService.GetOrderByIdAsync(id);

        // Customers can only see their own orders
        var userId = User.GetUserId();
        if (order.User?.Id != userId && !User.IsInRole("Admin") && !User.IsInRole("Staff"))
            return NotFound();

        return Ok(order);
    }

    /// <summary>
    /// Get the current user's orders.
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<PagedResponse<OrderResponse>>> GetMyOrders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.GetUserId();
        var orders = await _orderService.GetUserOrdersAsync(userId, page, pageSize);
        return Ok(orders);
    }

    /// <summary>
    /// Get the status history timeline for an order.
    /// </summary>
    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<IReadOnlyList<OrderStatusHistoryResponse>>>
        GetOrderHistory(Guid id)
    {
        var history = await _orderService.GetOrderHistoryAsync(id);
        return Ok(history);
    }

    // ─── Admin endpoints ──────────────────────────────────────────────────

    /// <summary>
    /// Get all orders, optionally filtered to a specific user.
    /// Requires Staff or Admin role.
    /// GH #10: GET /Orders?userId=&page=&pageSize=
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<PagedResponse<OrderResponse>>> GetAllOrders(
        [FromQuery] Guid? userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var orders = await _orderService.GetAllOrdersAsync(userId, page, pageSize);
        return Ok(orders);
    }

    /// <summary>
    /// Get orders filtered by status. Requires Staff or Admin role.
    /// </summary>
    [HttpGet("status/{status}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<PagedResponse<OrderResponse>>> GetOrdersByStatus(
        string status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var orders = await _orderService.GetOrdersByStatusAsync(status, page, pageSize);
        return Ok(orders);
    }

    /// <summary>
    /// Get recent orders for the admin dashboard. Requires Staff or Admin role.
    /// </summary>
    [HttpGet("recent")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<IReadOnlyList<OrderResponse>>> GetRecentOrders(
        [FromQuery] int count = 10)
    {
        var orders = await _orderService.GetRecentOrdersAsync(count);
        return Ok(orders);
    }

    /// <summary>
    /// Update an order's status. Requires Staff or Admin role.
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<OrderResponse>> UpdateOrderStatus(
        Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        var userId = User.GetUserId();
        var order = await _orderService.UpdateOrderStatusAsync(
            id, request.Status, userId, request.Notes);
        return Ok(order);
    }
}