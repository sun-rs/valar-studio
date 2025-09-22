"""Network utilities for IP address handling."""
from fastapi import Request


def get_real_ip(request: Request) -> str:
    """
    获取客户端真实IP地址
    考虑反向代理和负载均衡的情况
    """
    # 首先尝试从客户端直接获取IP（对于局域网访问最准确）
    if request.client and request.client.host:
        client_ip = request.client.host
        # 如果不是本地回环地址，直接返回
        if client_ip != "127.0.0.1" and client_ip != "localhost" and client_ip != "::1":
            return client_ip

    # 检查常见的代理头
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For可能包含多个IP，第一个是真实客户端IP
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    forwarded = request.headers.get("X-Forwarded")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # 如果所有方法都失败，返回客户端IP（即使是127.0.0.1）
    if request.client and request.client.host:
        return request.client.host

    # 最后的fallback
    return "unknown"


def get_user_agent(request: Request) -> str:
    """获取用户代理字符串"""
    return request.headers.get("User-Agent", "unknown")


def parse_user_agent(user_agent: str) -> dict:
    """
    简单解析用户代理字符串，提取设备信息
    返回包含操作系统和浏览器信息的字典
    """
    ua_lower = user_agent.lower()

    # 检测操作系统
    os_info = "Unknown"
    if "windows" in ua_lower:
        os_info = "Windows"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        os_info = "macOS"
    elif "iphone" in ua_lower:
        os_info = "iPhone"
    elif "ipad" in ua_lower:
        os_info = "iPad"
    elif "android" in ua_lower:
        os_info = "Android"
    elif "linux" in ua_lower:
        os_info = "Linux"

    # 检测浏览器
    browser_info = "Unknown"
    if "chrome" in ua_lower and "edg" not in ua_lower:
        browser_info = "Chrome"
    elif "firefox" in ua_lower:
        browser_info = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser_info = "Safari"
    elif "edg" in ua_lower:
        browser_info = "Edge"
    elif "opera" in ua_lower:
        browser_info = "Opera"

    # 检测设备类型
    device_type = "Desktop"
    if any(mobile in ua_lower for mobile in ["mobile", "android", "iphone"]):
        device_type = "Mobile"
    elif "tablet" in ua_lower or "ipad" in ua_lower:
        device_type = "Tablet"

    return {
        "os": os_info,
        "browser": browser_info,
        "device_type": device_type,
        "raw": user_agent
    }