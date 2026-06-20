/**
 * Pagination helper to handle standard list pagination parameters and format metadata.
 */
class PaginationHelper {
  /**
   * Parse request query parameters for pagination options
   * @param {Object} query - Express req.query object
   * @returns {Object} { limit, offset, page, order }
   */
  static getOptions(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const sortBy = query.sortBy || 'created_at';
    const sortOrder = (query.sortOrder || 'DESC').toUpperCase();

    // Prevent SQL injection / bad order values
    const validOrders = ['ASC', 'DESC'];
    const order = [[sortBy, validOrders.includes(sortOrder) ? sortOrder : 'DESC']];

    return {
      limit,
      offset,
      page,
      order
    };
  }

  /**
   * Format paginated data response
   * @param {Object} data - Result of findAndCountAll from Sequelize
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   * @returns {Object} Formatted data and meta
   */
  static formatResponse(data, page, limit) {
    const { count: totalItems, rows } = data;
    const currentPage = page;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      rows,
      meta: {
        totalItems,
        totalPages,
        currentPage,
        limit,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    };
  }
}

module.exports = PaginationHelper;
