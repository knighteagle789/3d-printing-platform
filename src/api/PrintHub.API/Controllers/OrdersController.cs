using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
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
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var order = await _orderService.CreateOrderAsync(userId.Value, request);
            return CreatedAtAction(
                nameof(GetOrder),
                new { id = order.Id },
                order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific order by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderResponse>> GetOrder(Guid id)
    {
        var order = await _orderService.GetOrderByIdAsync(id);
        if (order == null) return NotFound();

        // Customers can only see their own orders
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (order.User?.Id != userId.Value && !User.IsInRole("Admin") && !User.IsInRole("Staff"))
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
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var orders = await _orderService.GetUserOrdersAsync(userId.Value, page, pageSize);
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
    /// Get recent orders for the admin dashboard.
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
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var order = await _orderService.UpdateOrderStatusAsync(
                id, request.Status, userId.Value, request.Notes);
            if (order == null) return NotFound();
            return Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return null;
        return userId;
    }
}