const connection = require("../models/db");

// Create post function
const createPost = (req, res) => {
  const author_id = req.token.userId;
  const { postText, postImg, postVideo } = req.body;
  const query = `INSERT INTO post (postText,postImg,postVideo,author_id) VALUE (?,?,?,?)`;
  const data = [postText, postImg, postVideo, author_id];
  connection.query(query, data, (error, result) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
    res.status(201).json({
      success: true,
      message: `Post created successfully`,
      result: result,
    });
  });
};

//create function to get all posts
const getAllPosts = (req, res) => {
  const query = `SELECT * FROM post WHERE isDeleted=0`;
  connection.query(query, (error, result) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: `All posts`,
      result: result,
    });
  });
};

// create function to get posts by use

const getPostByUserId = (req, res) => {
  const author_id = req.params.id;
  const friendshipRequest = req.token.userId;
  const query = `SELECT post.id,createdAt,post.isDeleted ,postText,postImg,postVideo,author_id,post.isPrivate,post.isReported,firstName,lastName,profileImg FROM post INNER JOIN user ON post.author_id=user.id WHERE post.author_id =? AND post.isDeleted=0 ORDER BY post.createdAt DESC `;
  const data = [author_id];
  connection.query(query, data, (error, result) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
    const query2 = `SELECT comment.author_id, comment.id,createdAt,comment.isDeleted,comment,comment.post_id,comment.isReported,firstName,lastName,profileImg FROM comment INNER JOIN user ON comment.author_id=user.id WHERE comment.isDeleted=0 ORDER BY comment.createdAt DESC`;
    connection.query(query2, (error, result2) => {
      result2.forEach((comment) => {
        result.forEach((post) => {
          if (post.id == comment.post_id) {
            if (post.comments) {
              post.comments.push(comment);
            } else {
              post.comments = [comment];
            }
          }
        });
      });
      const query3 = `SELECT post_reaction.author_id,post_reaction.post_id,post_reaction.isDeleted from post_reaction INNER JOIN post ON post.id = post_reaction.post_id WHERE post_reaction.isDeleted=0`;
      connection.query(query3, (error3, result3) => {
        result3.forEach((react) => {
          result.forEach((post) => {
            if (
              react.author_id === friendshipRequest &&
              post.id == react.post_id
            ) {
              post.isLiked = true;
            }
          });
        });

        const query4 = `SELECT comment_reaction.author_id,comment_reaction.comment_id,comment_reaction.isDeleted from comment_reaction INNER JOIN comment ON comment.id = comment_reaction.comment_id WHERE comment_reaction.isDeleted=0`;
        connection.query(query4, (error4, result4) => {
          result4.forEach((react) => {
            result2.forEach((comment) => {
              result.forEach((post) => {
                if (
                  react.author_id === friendshipRequest &&
                  comment.id == react.comment_id &&
                  comment.post_id == post.id
                ) {
                  post.isLikedComment = true;
                }
              });
            });
          });

          res.status(200).json({
            success: true,
            massage: "All the posts",
            result: result,
          });
        });
      });
    });
  });
};

//creating function to get user posts then update on them using Post Id
const updatePostById = (req, res) => {
  const { postText, postImg, postVideo } = req.body;
  const id = req.params.id;
  const author_id = req.token.userId;
  const query = `SELECT * FROM post WHERE id=? AND author_id=? `;
  const data = [id, author_id];
  connection.query(query, data, (error, result) => {
    if (error) {
      return res.status(404).json({
        success: false,
        massage: `Server error`,
        error: error,
      });
    }
    if (!result) {
      res.status(404).json({
        success: false,
        massage: `The Post: ${id} is not found`,
        error: error,
      });
    } else {
      const query = `UPDATE post SET postText=?, postImg=? WHERE id=? ;`;
      const data = [
        postText || result[0].postText,
        postImg || result[0].postImg,
        id,
      ];
      connection.query(query, data, (err, result) => {
        if (err) {
          return res.status(404).json({
            success: false,
            massage: `Server error`,
            error: err,
          });
        }
        if (result.affectedRows != 0) {
          res.status(201).json({
            success: true,
            massage: `Post updated`,
            result: result,
          });
        }
      });
    }
  });
};

// create function to delete post using id
const deletePostById = (req, res) => {
  const id = req.params.id;
  const author_id = req.token.userId;
  const query = `UPDATE post SET isDeleted =1 WHERE author_id=? AND id=?`;
  const data = [author_id, id];
  connection.query(query, data, (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        massage: "Server Error",
        err: err,
      });
    }
    if (!result.changedRows) {
      return res.status(404).json({
        success: false,
        massage: `The Post: ${id} is not found`,
        err: err,
      });
    }
    res.status(200).json({
      success: true,
      massage: `Succeeded to delete post with id: ${id}`,
      result: result,
    });
  });
};

//this function will update isReported to 1 if the post reported
const reportPostById = (req, res) => {
  const id = req.params.id;
  const query = `UPDATE post SET isReported=1 WHERE id=?`;
  const data = [id];
  connection.query(query, data, (error, result) => {
    if (error) {
      return res.status(404).json({
        success: false,
        massage: `Server error`,
        error: err,
      });
    }
    if (result.affectedRows != 0) {
      res.status(201).json({
        success: true,
        massage: `Post reported`,
        result: result,
      });
    }
  });
};

// this function will remove the reported post by the admin using the id for the post
const removePostByIdAdmin = (req, res) => {
  const id = req.params.id;
  const query = `SELECT * FROM post WHERE isReported = 1 AND id =?`;
  const data = [id];
  connection.query(query, data, (error, result) => {
    if (error) {
      return res.status(404).json({
        success: false,
        massage: `Server error`,
        error: error,
      });
    }
    if (!result) {
      res.status(404).json({
        success: false,
        massage: `The Post: ${id} is not found`,
        error: error,
      });
    } else {
      const query = `UPDATE post SET isDeleted=1 WHERE id=?`;
      const data = [id];
      connection.query(query, data, (err, result2) => {
        if (!result2.changedRows) {
          return res.status(404).json({
            success: false,
            massage: `The Post: ${id} is not found`,
            err: err,
          });
        }
        res.status(200).json({
          success: true,
          massage: `Succeeded to delete post with id: ${id}`,
          result: result2,
        });
      });
    }
  });
};

// this function will get all reported posts and not deleted yet
const getReportedPosts = (req, res) => {
  const limit = 6;
  const page = req.query.page;
  const offset = (page - 1) * limit;
  const query =
    `SELECT post.id,createdAt,post.isDeleted ,postText,postImg,postVideo,author_id,post.isPrivate,post.isReported,firstName,lastName,profileImg FROM post INNER JOIN user ON post.author_id=user.id  WHERE post.isReported = 1 AND post.isDeleted=0 limit ` +
    limit +
    " OFFSET " +
    offset;
  const query2 = `SELECT COUNT(*) FROM post WHERE isReported =1 AND isDeleted =0`;

  connection.query(query, (error, result) => {
    if (error) {
      return res.status(404).json({
        success: false,
        massage: `Server error`,
        error: error,
      });
    }
    connection.query(query2, (error2, result2) => {
      if (error2) {
        return res.status(500).json({
          success: false,
          message: error2.message,
        });
      }
      res.status(201).json({
        success: true,
        message: `All Reported posts`,
        users_count: result2[0]["COUNT(*)"],
        result: result,
      });
    });
  });
};

// this function will get friends posts with the logged user posts
const getFriendsPosts = (req, res) => {
  const friendshipRequest = req.token.userId;
  const query = `SELECT post.id,createdAt,post.isDeleted ,postText,postImg,postVideo,author_id,post.isPrivate,post.isReported,firstName,lastName,profileImg FROM post INNER JOIN user ON post.author_id=user.id WHERE post.isDeleted=0 AND post.author_id =? OR post.isDeleted=0 AND post.author_id IN(SELECT friendshipAccept FROM friendship  WHERE friendshipRequest=?  AND isDeleted=0) OR post.isDeleted=0 AND post.author_id IN(SELECT friendshipRequest FROM friendship  WHERE friendshipAccept=?  AND isDeleted=0) AND post.isDeleted=0  ORDER BY post.createdAt DESC `;
  const data = [friendshipRequest, friendshipRequest, friendshipRequest];
  connection.query(query, data, (error, result) => {
    if (error) {
      return res.status(404).json({
        success: false,
        massage: `Server error`,
        error: error,
      });
    }
    const query2 = `SELECT comment.author_id, comment.id,createdAt,comment.isDeleted,comment,comment.post_id,comment.isReported,firstName,lastName,profileImg FROM comment INNER JOIN user ON comment.author_id=user.id WHERE comment.isDeleted=0 ORDER BY comment.createdAt DESC`;
    connection.query(query2, (error, result2) => {
      result2.forEach((comment) => {
        result.forEach((post) => {
          if (post.id == comment.post_id) {
            if (post.comments) {
              post.comments.push(comment);
            } else {
              post.comments = [comment];
            }
          }
        });
      });
      const query3 = `SELECT   post_reaction.author_id,post_reaction.post_id,post_reaction.isDeleted from post_reaction INNER JOIN post ON post.id = post_reaction.post_id WHERE post_reaction.isDeleted=0`;
      connection.query(query3, (error3, result3) => {
        result3.forEach((react) => {
          result.forEach((post) => {
            if (
              react.author_id === friendshipRequest &&
              post.id == react.post_id
            ) {
              post.isLiked = true;
            }
          });
        });
        const query4 = `SELECT comment_reaction.author_id,comment_reaction.comment_id,comment_reaction.isDeleted from comment_reaction INNER JOIN comment ON comment.id = comment_reaction.comment_id WHERE comment_reaction.isDeleted=0`;
        connection.query(query4, (error4, result4) => {
          result4.forEach((react) => {
            result2.forEach((comment) => {
              result.forEach((post) => {
                if (
                  react.author_id === friendshipRequest &&
                  comment.id == react.comment_id &&
                  comment.post_id == post.id
                ) {
                  comment.isLikedComment = true;
                }
              });
            });
          });

          res.status(200).json({
            success: true,
            massage: "All the posts",
            result: result,
            result3: result3,
          });
        });
      });
    });
  });
};

module.exports = {
  createPost,
  getAllPosts,
  getPostByUserId,
  updatePostById,
  deletePostById,
  reportPostById,
  removePostByIdAdmin,
  getReportedPosts,
  getFriendsPosts,
};
