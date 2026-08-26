package com.osmtest.mapper;

import com.osmtest.domain.AppUserRow;
import org.apache.ibatis.annotations.Param;

public interface AppUserMapper {
    AppUserRow findByUserId(@Param("userId") String userId);
}
